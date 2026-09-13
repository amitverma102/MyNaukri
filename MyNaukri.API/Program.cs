using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Authentication;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Jobs;
using MyNaukri.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Bind JWT Options
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("JwtOptions"));

// Dependency Injection
builder.Services.AddScoped<IJwtProvider, JwtProvider>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IAiService, DbAiService>();
builder.Services.AddScoped<IResumeParser, GeminiResumeParser>();
builder.Services.AddSingleton<IResumeProcessingQueue, ResumeProcessingQueue>();
builder.Services.AddHostedService<ResumeProcessingBackgroundService>();
builder.Services.AddScoped<IStorageService, AzureBlobStorageService>();
builder.Services.AddScoped<ISearchService, DbSearchService>();
builder.Services.AddScoped<INotificationService, MyNaukri.Infrastructure.Services.Email.SmtpNotificationService>();
builder.Services.AddScoped<ICreditService, CreditService>();
builder.Services.AddScoped<IInstitutionCreditService, InstitutionCreditService>();
builder.Services.AddScoped<ICreditLedgerService, CreditLedgerService>();
builder.Services.AddScoped<IRazorpayService, MyNaukri.Infrastructure.Services.Payment.RazorpayService>();
builder.Services.AddScoped<ICalendarInviteService, CalendarInviteService>();
builder.Services.AddScoped<IPushNotificationService, ExpoPushNotificationService>();
builder.Services.AddSingleton<IVideoVerificationQueue, VideoVerificationQueue>();
builder.Services.AddScoped<IVideoVerificationService, GeminiVideoVerificationService>();
builder.Services.AddHostedService<VideoVerificationBackgroundService>();
builder.Services.Configure<MyNaukri.Infrastructure.Services.Payment.RazorpaySettings>(builder.Configuration.GetSection("Razorpay"));
builder.Services.Configure<MyNaukri.Infrastructure.Services.Email.EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.Configure<AzureBlobStorageSettings>(builder.Configuration.GetSection("AzureBlobStorage"));
builder.Services.AddHostedService<ExpireCreditsJob>();
builder.Services.AddHostedService<DailyJobMatchEmailBackgroundService>();
builder.Services.AddHostedService<DailyCreditActivityReportBackgroundService>();

// Configure Health Checks for Liveness and Readiness Probes
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("Database");

// Configure ASP.NET Core Rate Limiter
builder.Services.AddRateLimiter(rateLimiterOptions =>
{
    rateLimiterOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    rateLimiterOptions.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"type\": \"https://tools.ietf.org/html/rfc6585#section-4\", \"title\": \"Too Many Requests\", \"status\": 429, \"detail\": \"Too many requests. Please wait a moment before trying again.\"}", 
            token);
    };

    // Strict rate limiting on authentication and password reset (10 req/min per IP)
    rateLimiterOptions.AddPolicy("AuthRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // AI Rate Limit (5 req/min per user)
    rateLimiterOptions.AddPolicy("AiRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.Identity?.Name ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Global rate limit: 120 req/min per IP, bypassing internal health checks
    rateLimiterOptions.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        if (httpContext.Request.Path.StartsWithSegments("/healthz") || httpContext.Request.Path.StartsWithSegments("/readyz"))
        {
            return RateLimitPartition.GetNoLimiter("health");
        }
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 10
            });
    });
});

// Configure Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtOptions:Issuer"],
            ValidAudience = builder.Configuration["JwtOptions:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["JwtOptions:SecretKey"]!))
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var dbContext = context.HttpContext.RequestServices.GetRequiredService<MyNaukri.Infrastructure.Data.ApplicationDbContext>();
                
                var userIdClaim = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var roleClaim = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                var sessionIdClaim = context.Principal?.FindFirst("SessionId")?.Value;

                if (userIdClaim != null && (roleClaim == "Recruiter" || roleClaim == "InstituteAdministrator"))
                {
                    if (Guid.TryParse(userIdClaim, out var userId))
                    {
                        var user = await dbContext.Users.FindAsync(userId);
                        if (user != null)
                        {
                            var currentDbSession = user.CurrentSessionId?.ToString();
                            if (currentDbSession != null && !currentDbSession.Equals(sessionIdClaim, StringComparison.OrdinalIgnoreCase))
                            {
                                context.Fail("Session invalidated due to new login.");
                            }
                        }
                    }
                }
            }
        };
    });

// Locked-down Production CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("ProductionCorsPolicy", policy =>
    {
        policy.WithOrigins(
            "https://edukey360.com",
            "https://www.edukey360.com",
            "https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:8081"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("Content-Disposition");
    });

    // Permissive policy for mobile and external API calls where Origin is omitted
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("Content-Disposition");
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddOpenApi();

var app = builder.Build();

// Database migration & seeding on container startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await context.Database.MigrateAsync();
    await SeedData.SeedJobsAsync(context);
}

// Global Exception Handler (RFC 7807 sanitization - prevents stack trace leakage)
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(feature?.Error, "Unhandled exception on {Path}", context.Request.Path);

        var problemDetails = new
        {
            type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
            title = "An error occurred while processing your request.",
            status = StatusCodes.Status500InternalServerError,
            traceId = context.TraceIdentifier
        };

        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

// Production Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

// Apply production CORS
app.UseCors("ProductionCorsPolicy");

// Apply Rate Limiting
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Health Check Endpoints
app.MapHealthChecks("/healthz", new HealthCheckOptions
{
    Predicate = _ => false // Liveness probe
});

app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Name == "Database" // Readiness probe
});

app.MapControllers();

app.Run();

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly ApplicationDbContext _db;
    public DatabaseHealthCheck(ApplicationDbContext db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _db.Database.CanConnectAsync(cancellationToken);
            return canConnect 
                ? HealthCheckResult.Healthy("Database connection active") 
                : HealthCheckResult.Unhealthy("Database unavailable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database connection failed", ex);
        }
    }
}
