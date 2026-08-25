using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Authentication;
using MyNaukri.Infrastructure.Data;
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
builder.Services.AddScoped<IStorageService, LocalMockStorageService>();
builder.Services.AddScoped<ISearchService, DbSearchService>();
builder.Services.AddScoped<INotificationService, MockNotificationService>();
builder.Services.AddScoped<ICreditService, CreditService>();
builder.Services.AddScoped<IInstitutionCreditService, InstitutionCreditService>();

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
                        var authLogger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                        var allClaims = string.Join(", ", context.Principal.Claims.Select(c => $"{c.Type}: {c.Value}"));
                        authLogger.LogInformation("All Claims: {AllClaims}", allClaims);
                        
                        var user = await dbContext.Users.FindAsync(userId);
                        if (user != null)
                        {
                            var currentDbSession = user.CurrentSessionId?.ToString();
                            if (currentDbSession != null && !currentDbSession.Equals(sessionIdClaim, StringComparison.OrdinalIgnoreCase))
                            {
                                var authLogger2 = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                                authLogger2.LogWarning("Session invalidated. DB Session: {DbSession}, Token Session: {TokenSession}", currentDbSession, sessionIdClaim);
                                context.Fail("Session invalidated due to new login.");
                            }
                        }
                    }
                }
            }
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await context.Database.MigrateAsync();
    await SeedData.SeedJobsAsync(context);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
}

app.Run();
