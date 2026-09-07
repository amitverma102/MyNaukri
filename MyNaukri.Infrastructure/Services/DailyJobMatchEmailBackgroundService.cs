using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;
using System;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace MyNaukri.Infrastructure.Services;

public class DailyJobMatchEmailBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DailyJobMatchEmailBackgroundService> _logger;
    private readonly TimeZoneInfo _istTimeZone;

    public DailyJobMatchEmailBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<DailyJobMatchEmailBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        
        try
        {
            // Windows
            _istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            // Linux/macOS
            _istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DailyJobMatchEmailBackgroundService is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.UtcNow;
            var istNow = TimeZoneInfo.ConvertTime(now, _istTimeZone);
            
            // Explicitly set the offset so it is compared correctly regardless of the server's local time zone
            var nextRun = new DateTimeOffset(istNow.Date.AddHours(10), _istTimeZone.GetUtcOffset(istNow)); // 10:00 AM IST today

            if (istNow > nextRun)
            {
                nextRun = nextRun.AddDays(1); // 10:00 AM IST tomorrow
            }

            var delay = nextRun - istNow;
            _logger.LogInformation("Next daily job match email run at: {NextRun} IST (Delay: {Delay})", nextRun, delay);

            await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested)
                break;

            try
            {
                await ProcessJobMatchEmailsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during daily job match email processing.");
            }
        }
    }

    private async Task ProcessJobMatchEmailsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var aiService = scope.ServiceProvider.GetRequiredService<IAiService>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        
        var candidates = await context.Candidates
            .Include(c => c.User)
            .Where(c => c.IsSubscribedToJobAlerts)
            .ToListAsync(stoppingToken);

        _logger.LogInformation("Found {Count} candidates subscribed to job alerts.", candidates.Count);

        foreach (var candidate in candidates)
        {
            if (stoppingToken.IsCancellationRequested) break;

            if (string.IsNullOrWhiteSpace(candidate.Skills)) continue;

            var recommendations = await aiService.GetJobRecommendationsAsync(candidate.Id);
            var topJobs = recommendations.Take(10).ToList();

            if (!topJobs.Any()) continue;

            var emailBody = new StringBuilder();
            emailBody.AppendLine($"<p>Dear {candidate.User.FirstName},</p>");
            emailBody.AppendLine($"<p>Here are your daily job recommendations based on your profile:</p>");
            emailBody.AppendLine("<ul>");

            foreach (var job in topJobs)
            {
                emailBody.AppendLine($"<li><b>{job.Title}</b> at {job.CompanyName} - {job.Location}</li>");
            }
            
            emailBody.AppendLine("</ul>");
            emailBody.AppendLine($"<br><p>Best regards,<br>Team Edukey360</p>");
            
            // App URL for unsubscribe
            var unsubscribeLink = $"https://mynaukri-backend.greendune-87ffa7a1.centralus.azurecontainerapps.io/api/candidates/unsubscribe/{candidate.Id}";
            emailBody.AppendLine($"<br><hr><p style='font-size: 12px; color: gray;'>If you no longer wish to receive these alerts, you can <a href='{unsubscribeLink}'>unsubscribe here</a>.</p>");

            await notificationService.SendEmailAsync(
                candidate.User.Email,
                "Your Daily Job Recommendations",
                emailBody.ToString(),
                emailType: MyNaukri.Domain.Enums.EmailType.JobAlert
            );
            
            _logger.LogInformation("Sent daily job match email to {Email}", candidate.User.Email);
        }
    }
}
