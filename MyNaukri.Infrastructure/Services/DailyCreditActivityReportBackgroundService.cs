using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using System;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace MyNaukri.Infrastructure.Services;

public class DailyCreditActivityReportBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DailyCreditActivityReportBackgroundService> _logger;
    private readonly TimeZoneInfo _istTimeZone;

    public DailyCreditActivityReportBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<DailyCreditActivityReportBackgroundService> logger)
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
        _logger.LogInformation("DailyCreditActivityReportBackgroundService is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.UtcNow;
            var istNow = TimeZoneInfo.ConvertTime(now, _istTimeZone);
            var nextRun = istNow.Date.AddHours(10); // 10:00 AM IST today

            if (istNow > nextRun)
            {
                nextRun = nextRun.AddDays(1); // 10:00 AM IST tomorrow
            }

            var delay = nextRun - istNow;
            _logger.LogInformation("Next daily credit activity report run at: {NextRun} IST (Delay: {Delay})", nextRun, delay);

            await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested)
                break;

            try
            {
                await ProcessCreditActivityReportsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during daily credit activity report processing.");
            }
        }
    }

    private async Task ProcessCreditActivityReportsAsync(CancellationToken stoppingToken)
    {
        var istToday = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, _istTimeZone).Date;
        var istYesterday = istToday.AddDays(-1);
        
        // Convert the IST dates back to UTC for database querying
        var utcStart = TimeZoneInfo.ConvertTimeToUtc(istYesterday, _istTimeZone);
        var utcEnd = TimeZoneInfo.ConvertTimeToUtc(istToday, _istTimeZone);

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        
        var adminProfiles = await context.InstituteAdminProfiles
            .Include(p => p.User)
            .Include(p => p.Institution)
                .ThenInclude(i => i.CreditWallet)
            .Where(p => p.Institution.Status == InstitutionStatus.Active)
            .ToListAsync(stoppingToken);

        _logger.LogInformation("Found {Count} active institute admins to potentially send reports to.", adminProfiles.Count);

        foreach (var adminProfile in adminProfiles)
        {
            if (stoppingToken.IsCancellationRequested) break;

            var institutionId = adminProfile.InstitutionId;

            var transactions = await context.CreditTransactions
                .Where(t => t.InstitutionId == institutionId && t.CreatedAt >= utcStart && t.CreatedAt < utcEnd)
                .ToListAsync(stoppingToken);

            if (!transactions.Any())
            {
                continue; // Skip if no activity
            }

            int creditsAdded = transactions.Where(t => t.Credits > 0).Sum(t => t.Credits);
            int creditsConsumed = Math.Abs(transactions.Where(t => t.Credits < 0).Sum(t => t.Credits));
            int closingBalance = adminProfile.Institution.CreditWallet?.AvailableCredits ?? 0;

            var emailBody = new StringBuilder();
            emailBody.AppendLine($"<p>Dear {adminProfile.User.FirstName},</p>");
            emailBody.AppendLine($"<p>Here is the daily credit activity report for <b>{adminProfile.Institution.Name}</b> on {istYesterday:MMM dd, yyyy}:</p>");
            emailBody.AppendLine("<ul>");
            emailBody.AppendLine($"<li><b>Credits Added:</b> {creditsAdded}</li>");
            emailBody.AppendLine($"<li><b>Credits Consumed:</b> {creditsConsumed}</li>");
            emailBody.AppendLine($"<li><b>Closing Balance:</b> {closingBalance}</li>");
            emailBody.AppendLine("</ul>");
            
            emailBody.AppendLine($"<p>Detailed Activity:</p>");
            emailBody.AppendLine("<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse;'>");
            emailBody.AppendLine("<tr><th>Time (IST)</th><th>Transaction Type</th><th>Credits</th><th>Reason / Details</th></tr>");
            
            foreach (var tx in transactions.OrderBy(t => t.CreatedAt))
            {
                var txIstTime = TimeZoneInfo.ConvertTimeFromUtc(tx.CreatedAt, _istTimeZone);
                var amountFormatted = tx.Credits > 0 ? $"+{tx.Credits}" : tx.Credits.ToString();
                var color = tx.Credits > 0 ? "green" : "red";
                var details = string.IsNullOrWhiteSpace(tx.Reason) ? tx.Description : tx.Reason;
                
                emailBody.AppendLine($"<tr>");
                emailBody.AppendLine($"<td>{txIstTime:HH:mm}</td>");
                emailBody.AppendLine($"<td>{tx.TransactionType}</td>");
                emailBody.AppendLine($"<td style='color: {color};'>{amountFormatted}</td>");
                emailBody.AppendLine($"<td>{details ?? "-"}</td>");
                emailBody.AppendLine($"</tr>");
            }
            emailBody.AppendLine("</table>");

            emailBody.AppendLine($"<br><p>Best regards,<br>Team Edukey360</p>");

            await notificationService.SendEmailAsync(
                adminProfile.User.Email,
                $"Daily Credit Activity Report - {istYesterday:MMM dd, yyyy}",
                emailBody.ToString(),
                emailType: MyNaukri.Domain.Enums.EmailType.JobAlert
            );
            
            _logger.LogInformation("Sent daily credit activity report to {Email} for Institution {InstitutionId}", adminProfile.User.Email, institutionId);
        }
    }
}
