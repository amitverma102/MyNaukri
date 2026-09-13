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

    public async Task ProcessCreditActivityReportsAsync(CancellationToken stoppingToken = default)
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

            // Only include credits and debits for users (recruiters) in the institute.
            // Exclude the admin's own central wallet side trade (RecruiterId == null) so that allocation to a recruiter
            // shows +amount for the recruiter without showing the duplicate -amount on the admin side.
            var transactions = await context.CreditTransactions
                .Include(t => t.Recruiter)
                    .ThenInclude(r => r!.User)
                .Where(t => t.InstitutionId == institutionId 
                            && t.RecruiterId != null 
                            && (t.Recruiter == null || t.Recruiter.UserId != adminProfile.UserId)
                            && t.CreatedAt >= utcStart 
                            && t.CreatedAt < utcEnd)
                .OrderBy(t => t.CreatedAt)
                .ToListAsync(stoppingToken);

            if (!transactions.Any())
            {
                continue; // Skip if no user credit/debit activity yesterday
            }

            int creditsAllocated = transactions.Where(t => t.Credits > 0).Sum(t => t.Credits);
            int creditsConsumed = Math.Abs(transactions.Where(t => t.Credits < 0).Sum(t => t.Credits));
            int availableBalance = adminProfile.Institution.CreditWallet?.AvailableCredits ?? 0;
            int totalAllocatedToRecruiters = adminProfile.Institution.CreditWallet?.TotalAllocatedCredits ?? 0;

            var emailBody = new StringBuilder();
            emailBody.AppendLine("<!DOCTYPE html>");
            emailBody.AppendLine("<html>");
            emailBody.AppendLine("<head>");
            emailBody.AppendLine("  <meta charset='utf-8'>");
            emailBody.AppendLine("  <meta name='viewport' content='width=device-width, initial-scale=1.0'>");
            emailBody.AppendLine("  <title>Daily Recruiter Credit Activity Report</title>");
            emailBody.AppendLine("</head>");
            emailBody.AppendLine("<body style='margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;'>");
            emailBody.AppendLine("  <div style='max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>");
            
            // Header
            emailBody.AppendLine("    <div style='background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 24px 32px; color: #ffffff;'>");
            emailBody.AppendLine("      <div style='font-size: 22px; font-weight: bold; letter-spacing: 0.5px;'>EduKey360</div>");
            emailBody.AppendLine($"      <div style='font-size: 13px; opacity: 0.9; margin-top: 4px;'>Daily Recruiter Credit Activity Report &bull; {istYesterday:dd-MM-yyyy}</div>");
            emailBody.AppendLine("    </div>");

            // Content
            emailBody.AppendLine("    <div style='padding: 28px 32px;'>");
            emailBody.AppendLine($"      <p style='font-size: 15px; margin: 0 0 12px 0;'>Dear <strong>{adminProfile.User.FirstName}</strong>,</p>");
            emailBody.AppendLine($"      <p style='font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;'>Here is the daily credit and debit activity for all recruiters and staff members at <strong>{adminProfile.Institution.Name}</strong> for <strong>{istYesterday:dd-MM-yyyy}</strong>:</p>");

            // Summary Card
            emailBody.AppendLine("      <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;'>");
            emailBody.AppendLine("        <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>");
            emailBody.AppendLine($"         <tr><td style='padding: 4px 0; color: #64748b;'>Credits Allocated to Recruiters:</td><td style='padding: 4px 0; font-weight: bold; color: #166534; text-align: right;'>+{creditsAllocated}</td></tr>");
            emailBody.AppendLine($"         <tr><td style='padding: 4px 0; color: #64748b;'>Credits Debited / Consumed:</td><td style='padding: 4px 0; font-weight: bold; color: #991b1b; text-align: right;'>-{creditsConsumed}</td></tr>");
            emailBody.AppendLine($"         <tr style='border-top: 1px solid #e2e8f0;'><td style='padding: 6px 0 2px 0; color: #64748b;'>Institution Wallet (Unallocated):</td><td style='padding: 6px 0 2px 0; font-weight: bold; color: #0f766e; text-align: right;'>{availableBalance} credits</td></tr>");
            emailBody.AppendLine($"         <tr><td style='padding: 2px 0; color: #64748b;'>Total Active Recruiter Balances:</td><td style='padding: 2px 0; font-weight: bold; color: #1e293b; text-align: right;'>{totalAllocatedToRecruiters} credits</td></tr>");
            emailBody.AppendLine("        </table>");
            emailBody.AppendLine("      </div>");

            // Activity Table
            emailBody.AppendLine("      <div style='font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin-bottom: 10px;'>Recruiter Transactions</div>");
            emailBody.AppendLine("      <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>");
            emailBody.AppendLine("        <thead>");
            emailBody.AppendLine("          <tr style='background-color: #f1f5f9; text-align: left;'>");
            emailBody.AppendLine("            <th style='padding: 8px 10px; border-bottom: 2px solid #cbd5e1; color: #475569;'>Time (IST)</th>");
            emailBody.AppendLine("            <th style='padding: 8px 10px; border-bottom: 2px solid #cbd5e1; color: #475569;'>User / Recruiter</th>");
            emailBody.AppendLine("            <th style='padding: 8px 10px; border-bottom: 2px solid #cbd5e1; color: #475569;'>Transaction</th>");
            emailBody.AppendLine("            <th style='padding: 8px 10px; border-bottom: 2px solid #cbd5e1; color: #475569; text-align: right;'>Credits</th>");
            emailBody.AppendLine("            <th style='padding: 8px 10px; border-bottom: 2px solid #cbd5e1; color: #475569;'>Details</th>");
            emailBody.AppendLine("          </tr>");
            emailBody.AppendLine("        </thead>");
            emailBody.AppendLine("        <tbody>");

            foreach (var tx in transactions)
            {
                var txIstTime = TimeZoneInfo.ConvertTimeFromUtc(tx.CreatedAt, _istTimeZone);
                var amountFormatted = tx.Credits > 0 ? $"+{tx.Credits}" : tx.Credits.ToString();
                var badgeBg = tx.Credits > 0 ? "#dcfce7" : "#fee2e2";
                var badgeColor = tx.Credits > 0 ? "#166534" : "#991b1b";
                var details = string.IsNullOrWhiteSpace(tx.Reason) ? tx.Description : tx.Reason;
                var recruiterName = tx.Recruiter?.User != null 
                    ? $"{tx.Recruiter.User.FirstName} {tx.Recruiter.User.LastName}".Trim() 
                    : "Recruiter";

                emailBody.AppendLine("          <tr style='border-bottom: 1px solid #e2e8f0;'>");
                emailBody.AppendLine($"            <td style='padding: 10px; color: #64748b; white-space: nowrap;'>{txIstTime:hh:mm tt} IST</td>");
                emailBody.AppendLine($"            <td style='padding: 10px; font-weight: 600; color: #1e293b;'>{recruiterName}</td>");
                emailBody.AppendLine($"            <td style='padding: 10px; color: #475569;'>{tx.TransactionType}</td>");
                emailBody.AppendLine($"            <td style='padding: 10px; text-align: right;'><span style='display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; background-color: {badgeBg}; color: {badgeColor};'>{amountFormatted}</span></td>");
                emailBody.AppendLine($"            <td style='padding: 10px; color: #64748b; font-size: 12px;'>{details ?? "-"}</td>");
                emailBody.AppendLine("          </tr>");
            }

            emailBody.AppendLine("        </tbody>");
            emailBody.AppendLine("      </table>");

            // Portal Link
            emailBody.AppendLine("      <div style='margin-top: 28px; text-align: center;'>");
            emailBody.AppendLine("        <a href='https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io/instituteadmin/recruiters' style='display: inline-block; padding: 10px 22px; background-color: #0f766e; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; border-radius: 6px;'>View Recruiter Audits on Dashboard</a>");
            emailBody.AppendLine("      </div>");
            emailBody.AppendLine("    </div>");

            // Footer
            emailBody.AppendLine("    <div style='background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;'>");
            emailBody.AppendLine($"      This daily report was automatically compiled by EduKey360 for {adminProfile.Institution.Name}.<br>");
            emailBody.AppendLine("      For support or queries, contact us at <a href='mailto:support@edukey360.com' style='color: #0f766e; text-decoration: underline;'>support@edukey360.com</a>.<br>");
            emailBody.AppendLine("      <a href='https://www.edukey360.com' style='color: #64748b; text-decoration: none;'>www.edukey360.com</a>");
            emailBody.AppendLine("    </div>");
            emailBody.AppendLine("  </div>");
            emailBody.AppendLine("</body>");
            emailBody.AppendLine("</html>");

            await notificationService.SendEmailAsync(
                adminProfile.User.Email,
                $"EduKey360: Daily Recruiter Credit Activity Report - {istYesterday:dd-MM-yyyy}",
                emailBody.ToString(),
                emailType: MyNaukri.Domain.Enums.EmailType.Default
            );
            
            _logger.LogInformation("Sent daily credit activity report to {Email} for Institution {InstitutionId}", adminProfile.User.Email, institutionId);
        }
    }
}
