using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class VideoVerificationBackgroundService : BackgroundService
{
    private readonly IVideoVerificationQueue _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<VideoVerificationBackgroundService> _logger;

    public VideoVerificationBackgroundService(
        IVideoVerificationQueue queue,
        IServiceProvider serviceProvider,
        ILogger<VideoVerificationBackgroundService> logger)
    {
        _queue = queue;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Video Verification Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var candidateId = await _queue.DequeueAsync(stoppingToken);

                using var scope = _serviceProvider.CreateScope();
                await ProcessCandidateVideoAsync(candidateId, scope.ServiceProvider, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing video verification.");
            }
        }
    }

    private async Task ProcessCandidateVideoAsync(Guid candidateId, IServiceProvider services, CancellationToken cancellationToken)
    {
        var dbContext = services.GetRequiredService<ApplicationDbContext>();
        var verificationService = services.GetRequiredService<IVideoVerificationService>();
        var pushService = services.GetRequiredService<IPushNotificationService>();

        var candidate = await dbContext.Candidates
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == candidateId, cancellationToken);

        if (candidate == null) return;

        if (string.IsNullOrWhiteSpace(candidate.DemoVideoUrl))
        {
            candidate.DemoVideoStatus = VideoVerificationStatus.Unverified;
            candidate.DemoVideoSubject = null;
            candidate.DemoVideoSummary = null;
            candidate.DemoVideoRejectionReason = null;
            candidate.DemoVideoVerifiedAt = null;
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        try
        {
            candidate.DemoVideoStatus = VideoVerificationStatus.Pending;
            await dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Verifying demo video for candidate {CandidateId} with URL: {Url}", candidateId, candidate.DemoVideoUrl);
            var result = await verificationService.VerifyVideoAsync(candidate.DemoVideoUrl, cancellationToken);

            candidate.DemoVideoStatus = result.Status;
            candidate.DemoVideoSubject = result.Subject;
            candidate.DemoVideoSummary = result.Summary;
            candidate.DemoVideoRejectionReason = result.RejectionReason;
            candidate.DemoVideoVerifiedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Completed video verification for candidate {CandidateId}. Status: {Status}", candidateId, result.Status);

            // Dispatch push notification to candidate if registered
            if (result.Status == VideoVerificationStatus.Verified)
            {
                await pushService.SendPushNotificationAsync(
                    candidate.UserId,
                    "Demo Video Verified!",
                    $"Your teaching demo for '{result.Subject ?? "Academics"}' was verified. Recruiters can now see your verified badge.",
                    new Dictionary<string, string>
                    {
                        { "type", "VIDEO_VERIFIED" },
                        { "candidateId", candidate.Id.ToString() }
                    });
            }
            else if (result.Status == VideoVerificationStatus.Rejected)
            {
                await pushService.SendPushNotificationAsync(
                    candidate.UserId,
                    "Demo Video Update",
                    result.RejectionReason ?? "Your demo video could not be verified as a teaching demonstration.",
                    new Dictionary<string, string>
                    {
                        { "type", "VIDEO_REJECTED" },
                        { "candidateId", candidate.Id.ToString() }
                    });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify video for candidate {CandidateId}", candidateId);
            candidate.DemoVideoStatus = VideoVerificationStatus.FlaggedForReview;
            candidate.DemoVideoRejectionReason = "Verification encountered a temporary error and is queued for review.";
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
