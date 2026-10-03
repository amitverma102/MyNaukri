using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class InterviewReminderBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<InterviewReminderBackgroundService> _logger;

    public InterviewReminderBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<InterviewReminderBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("InterviewReminderBackgroundService is running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessUpcomingInterviewsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error processing interview reminders in background worker.");
            }

            // Run check every 60 seconds
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    public async Task<int> ProcessUpcomingInterviewsAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var whatsAppService = scope.ServiceProvider.GetRequiredService<IWhatsAppNotificationService>();
        var pushService = scope.ServiceProvider.GetRequiredService<IPushNotificationService>();

        var nowUtc = DateTime.UtcNow;
        // Check for interviews scheduled between 20 and 40 minutes from now (~30 min reminder window)
        var windowStart = nowUtc.AddMinutes(20);
        var windowEnd = nowUtc.AddMinutes(40);

        var upcomingInterviews = await context.JobApplications
            .Include(a => a.Job)
                .ThenInclude(j => j.Institution)
            .Include(a => a.Job)
                .ThenInclude(j => j.Recruiter)
                    .ThenInclude(r => r.User)
            .Include(a => a.Candidate)
                .ThenInclude(c => c.User)
            .Where(a => a.Status == ApplicationStatus.InterviewScheduled &&
                        a.InterviewDate.HasValue &&
                        a.InterviewDate.Value >= windowStart &&
                        a.InterviewDate.Value <= windowEnd &&
                        !a.IsInterviewReminderSent)
            .ToListAsync(cancellationToken);

        if (!upcomingInterviews.Any())
        {
            return 0;
        }

        _logger.LogInformation("Found {Count} upcoming interview(s) due for 30-minute reminder.", upcomingInterviews.Count);

        foreach (var application in upcomingInterviews)
        {
            try
            {
                var institutionName = application.Job.Institution?.Name ?? "Institution";
                var candidateName = application.Candidate.User != null 
                    ? $"{application.Candidate.User.FirstName} {application.Candidate.User.LastName}".Trim() 
                    : "Candidate";
                var recruiterName = application.Job.Recruiter?.User != null 
                    ? $"{application.Job.Recruiter.User.FirstName} {application.Job.Recruiter.User.LastName}".Trim() 
                    : "Recruiter";

                string locationOrLink = application.InterviewMode switch
                {
                    InterviewMode.Online => !string.IsNullOrWhiteSpace(application.InterviewLink) ? application.InterviewLink : "Online Video Call",
                    InterviewMode.InPerson => !string.IsNullOrWhiteSpace(application.InterviewVenue) ? application.InterviewVenue : (application.Job.Location ?? "On-site Venue"),
                    InterviewMode.Telephonic => !string.IsNullOrWhiteSpace(application.InterviewDetails) ? $"Telephonic: {application.InterviewDetails}" : "Telephonic Interview",
                    _ => "TBD"
                };

                var interviewDateUtc = application.InterviewDate!.Value;
                var modeStr = application.InterviewMode?.ToString() ?? "Online";

                // 1. Send WhatsApp 30-minute reminder to Candidate
                if (!string.IsNullOrWhiteSpace(application.Candidate.PhoneNumber))
                {
                    await whatsAppService.SendInterview30MinReminderCandidateAsync(
                        application.Candidate.PhoneNumber,
                        candidateName,
                        application.Job.Title,
                        institutionName,
                        interviewDateUtc,
                        modeStr,
                        locationOrLink
                    );
                }

                // 2. Send WhatsApp 30-minute reminder to Recruiter
                var recruiterMobile = application.Job.Recruiter?.Mobile;
                if (!string.IsNullOrWhiteSpace(recruiterMobile))
                {
                    await whatsAppService.SendInterview30MinReminderRecruiterAsync(
                        recruiterMobile,
                        recruiterName,
                        candidateName,
                        application.Job.Title,
                        interviewDateUtc,
                        modeStr,
                        locationOrLink
                    );
                }

                // 3. Dispatch Expo Push Notification to Candidate device
                _ = pushService.SendPushNotificationAsync(
                    application.Candidate.UserId,
                    "Interview in 30 Minutes! ⏰",
                    $"Your interview for '{application.Job.Title}' at {institutionName} begins in 30 minutes."
                );

                application.IsInterviewReminderSent = true;
                application.InterviewReminderSentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch 30-minute reminder for application {AppId}", application.Id);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        return upcomingInterviews.Count;
    }
}
