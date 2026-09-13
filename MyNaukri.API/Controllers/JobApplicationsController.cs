using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;
using System.Text;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class JobApplicationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICalendarInviteService _calendarService;
    private readonly IPushNotificationService _pushService;
    private readonly INotificationService _notificationService;
    private readonly IAiService _aiService;
    private readonly IStorageService _storageService;

    public JobApplicationsController(
        ApplicationDbContext context,
        ICalendarInviteService calendarService,
        IPushNotificationService pushService,
        INotificationService notificationService,
        IAiService aiService,
        IStorageService storageService)
    {
        _context = context;
        _calendarService = calendarService;
        _pushService = pushService;
        _notificationService = notificationService;
        _aiService = aiService;
        _storageService = storageService;
    }

    public class ApplyJobRequest
    {
        public string? ScreeningAnswersJson { get; set; }
        public string? CoverLetter { get; set; }
        public string? ResumeUrl { get; set; }
    }

    [HttpPost("apply/{jobId}")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult> ApplyToJob(Guid jobId, [FromBody] ApplyJobRequest? request = null)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return StatusCode(403, "User is not registered as a candidate.");

        var job = await _context.Jobs.FindAsync(jobId);
        if (job == null || !job.IsActive) return NotFound("Job not found or is closed.");

        var existingApplication = await _context.JobApplications
            .FirstOrDefaultAsync(a => a.JobId == jobId && a.CandidateId == candidate.Id);
            
        if (existingApplication != null)
        {
            return BadRequest("You have already applied to this job.");
        }

        decimal? matchScore = null;
        string feedback = string.Empty;
        try
        {
            var comparison = await _aiService.CompareResumeWithJobAsync(candidate.Id, jobId);
            if (comparison != null)
            {
                matchScore = comparison.MatchScore;
                feedback = comparison.MatchSummary;
            }
        }
        catch
        {
            // Graceful fallback if AI evaluation fails
        }

        var application = new JobApplication
        {
            JobId = jobId,
            CandidateId = candidate.Id,
            Status = ApplicationStatus.Applied,
            ScreeningAnswersJson = request?.ScreeningAnswersJson,
            CoverLetter = request?.CoverLetter,
            ResumeUrl = request?.ResumeUrl,
            AiMatchScore = matchScore,
            AiFeedback = feedback
        };

        _context.JobApplications.Add(application);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Applied successfully." });
    }

    [HttpPost("apply-with-resume/{jobId}")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult> ApplyWithResume(
        Guid jobId,
        [FromForm] IFormFile? resumeFile,
        [FromForm] string? coverLetter = null,
        [FromForm] string? screeningAnswersJson = null,
        [FromForm] bool updateProfileResume = true)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return StatusCode(403, "User is not registered as a candidate.");

        var job = await _context.Jobs.FindAsync(jobId);
        if (job == null || !job.IsActive) return NotFound("Job not found or is closed.");

        var existingApplication = await _context.JobApplications
            .FirstOrDefaultAsync(a => a.JobId == jobId && a.CandidateId == candidate.Id);
            
        if (existingApplication != null)
        {
            return BadRequest("You have already applied to this job.");
        }

        string? appliedResumeUrl = null;
        if (resumeFile != null && resumeFile.Length > 0)
        {
            using var memoryStream = new MemoryStream();
            await resumeFile.CopyToAsync(memoryStream);
            var fileBytes = memoryStream.ToArray();

            appliedResumeUrl = await _storageService.UploadResumeAsync(fileBytes, resumeFile.FileName, candidate.Id);

            if (updateProfileResume)
            {
                candidate.ResumeUrl = appliedResumeUrl;
                try
                {
                    var parsedData = await _aiService.ParseResumeAsync(fileBytes, resumeFile.FileName);
                    if (string.IsNullOrEmpty(candidate.Skills) && !string.IsNullOrEmpty(parsedData.Skills))
                        candidate.Skills = parsedData.Skills;
                }
                catch { }
            }
        }

        decimal? matchScore = null;
        string feedback = string.Empty;
        try
        {
            var comparison = await _aiService.CompareResumeWithJobAsync(candidate.Id, jobId);
            if (comparison != null)
            {
                matchScore = comparison.MatchScore;
                feedback = comparison.MatchSummary;
            }
        }
        catch { }

        var application = new JobApplication
        {
            JobId = jobId,
            CandidateId = candidate.Id,
            Status = ApplicationStatus.Applied,
            ScreeningAnswersJson = screeningAnswersJson,
            CoverLetter = coverLetter,
            ResumeUrl = appliedResumeUrl,
            AiMatchScore = matchScore,
            AiFeedback = feedback
        };

        _context.JobApplications.Add(application);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Applied successfully.", ResumeUrl = appliedResumeUrl });
    }

    [HttpGet("candidate")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<IEnumerable<JobApplicationDto>>> GetCandidateApplications()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return StatusCode(403, "User is not registered as a candidate.");

        var applications = await _context.JobApplications
            .Include(a => a.Job)
            .ThenInclude(j => j.Institution)
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .Where(a => a.CandidateId == candidate.Id)
            .Select(a => new JobApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                CandidateId = a.CandidateId,
                Status = a.Status,
                AiMatchScore = a.AiMatchScore,
                AiFeedback = a.AiFeedback,
                InterviewDate = a.InterviewDate,
                InterviewMode = a.InterviewMode,
                InterviewLink = a.InterviewLink,
                InterviewVenue = a.InterviewVenue,
                InterviewDetails = a.InterviewDetails,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                CandidatePhoneNumber = a.Candidate.PhoneNumber,
                CandidateResumeUrl = !string.IsNullOrEmpty(a.ResumeUrl) ? a.ResumeUrl : a.Candidate.ResumeUrl,
                CandidateProfilePictureUrl = !string.IsNullOrEmpty(a.Candidate.ProfilePictureUrl) ? a.Candidate.ProfilePictureUrl : a.Candidate.User.ProfilePictureUrl,
                CoverLetter = a.CoverLetter,
                ScreeningAnswersJson = a.ScreeningAnswersJson,
                JobTitle = a.Job.Title,
                CompanyName = a.Job.Institution != null ? a.Job.Institution.Name : string.Empty,
                InstitutionLogoUrl = a.Job.Institution != null ? a.Job.Institution.LogoUrl : null
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("candidate/interviews")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<IEnumerable<JobApplicationDto>>> GetCandidateInterviews()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return StatusCode(403, "User is not registered as a candidate.");

        var applications = await _context.JobApplications
            .Include(a => a.Job)
            .ThenInclude(j => j.Institution)
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .Where(a => a.CandidateId == candidate.Id && a.Status == ApplicationStatus.InterviewScheduled)
            .Select(a => new JobApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                CandidateId = a.CandidateId,
                Status = a.Status,
                AiMatchScore = a.AiMatchScore,
                AiFeedback = a.AiFeedback,
                InterviewDate = a.InterviewDate,
                InterviewMode = a.InterviewMode,
                InterviewLink = a.InterviewLink,
                InterviewVenue = a.InterviewVenue,
                InterviewDetails = a.InterviewDetails,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                CandidatePhoneNumber = a.Candidate.PhoneNumber,
                CandidateResumeUrl = !string.IsNullOrEmpty(a.ResumeUrl) ? a.ResumeUrl : a.Candidate.ResumeUrl,
                CandidateProfilePictureUrl = !string.IsNullOrEmpty(a.Candidate.ProfilePictureUrl) ? a.Candidate.ProfilePictureUrl : a.Candidate.User.ProfilePictureUrl,
                CoverLetter = a.CoverLetter,
                ScreeningAnswersJson = a.ScreeningAnswersJson,
                JobTitle = a.Job.Title,
                CompanyName = a.Job.Institution != null ? a.Job.Institution.Name : string.Empty,
                InstitutionLogoUrl = a.Job.Institution != null ? a.Job.Institution.LogoUrl : null
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("job/{jobId}")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult<IEnumerable<JobApplicationDto>>> GetApplicationsForJob(Guid jobId)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.RecruiterId == recruiter.Id);
        if (job == null) return NotFound("Job not found or you don't have permission to view its applications.");

        var applications = await _context.JobApplications
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .Where(a => a.JobId == jobId)
            .Select(a => new JobApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                CandidateId = a.CandidateId,
                Status = a.Status,
                AiMatchScore = a.AiMatchScore,
                AiFeedback = a.AiFeedback,
                InterviewDate = a.InterviewDate,
                InterviewMode = a.InterviewMode,
                InterviewLink = a.InterviewLink,
                InterviewVenue = a.InterviewVenue,
                InterviewDetails = a.InterviewDetails,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                CandidatePhoneNumber = a.Candidate.PhoneNumber,
                CandidateResumeUrl = !string.IsNullOrEmpty(a.ResumeUrl) ? a.ResumeUrl : a.Candidate.ResumeUrl,
                CandidateProfilePictureUrl = !string.IsNullOrEmpty(a.Candidate.ProfilePictureUrl) ? a.Candidate.ProfilePictureUrl : a.Candidate.User.ProfilePictureUrl,
                CoverLetter = a.CoverLetter,
                ScreeningAnswersJson = a.ScreeningAnswersJson,
                JobTitle = job.Title
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("interviews")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult<IEnumerable<JobApplicationDto>>> GetInterviews()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var applications = await _context.JobApplications
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .Include(a => a.Job)
            .Where(a => a.Job.RecruiterId == recruiter.Id && a.Status == ApplicationStatus.InterviewScheduled)
            .Select(a => new JobApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                CandidateId = a.CandidateId,
                Status = a.Status,
                AiMatchScore = a.AiMatchScore,
                AiFeedback = a.AiFeedback,
                InterviewDate = a.InterviewDate,
                InterviewMode = a.InterviewMode,
                InterviewLink = a.InterviewLink,
                InterviewVenue = a.InterviewVenue,
                InterviewDetails = a.InterviewDetails,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                CandidatePhoneNumber = a.Candidate.PhoneNumber,
                CandidateResumeUrl = !string.IsNullOrEmpty(a.ResumeUrl) ? a.ResumeUrl : a.Candidate.ResumeUrl,
                CandidateProfilePictureUrl = !string.IsNullOrEmpty(a.Candidate.ProfilePictureUrl) ? a.Candidate.ProfilePictureUrl : a.Candidate.User.ProfilePictureUrl,
                CoverLetter = a.CoverLetter,
                ScreeningAnswersJson = a.ScreeningAnswersJson,
                JobTitle = a.Job.Title
            })
            .ToListAsync();

        return Ok(applications);
    }

    public class UpdateStatusRequest
    {
        public ApplicationStatus Status { get; set; }
        public string? Note { get; set; }
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult> UpdateApplicationStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var application = await _context.JobApplications
            .Include(a => a.Job)
            .ThenInclude(j => j.Institution)
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(a => a.Id == id && a.Job.RecruiterId == recruiter.Id);
            
        if (application == null) return NotFound("Application not found or no permission.");

        application.Status = request.Status;
        await _context.SaveChangesAsync();

        // Dispatch push notification to candidate asynchronously
        _ = _pushService.SendPushNotificationAsync(
            application.Candidate.UserId,
            "Application Status Updated",
            $"Your application for '{application.Job.Title}' has been updated to {request.Status}."
        );

        // Dispatch status update email to candidate asynchronously
        if (!string.IsNullOrWhiteSpace(application.Candidate.User?.Email))
        {
            var institutionName = application.Job.Institution?.Name ?? "Institution";
            var candidateName = $"{application.Candidate.User.FirstName} {application.Candidate.User.LastName}".Trim();
            var emailHtml = BuildStatusUpdateEmailHtml(
                candidateName: candidateName,
                jobTitle: application.Job.Title,
                institutionName: institutionName,
                location: application.Job.Location,
                newStatus: request.Status,
                note: request.Note
            );

            _ = _notificationService.SendEmailAsync(
                to: application.Candidate.User.Email,
                subject: $"Application Update: {application.Job.Title} at {institutionName}",
                body: emailHtml,
                isHtml: true,
                emailType: EmailType.Default
            );
        }

        return NoContent();
    }

    public class ScheduleInterviewRequest
    {
        public DateTime InterviewDate { get; set; }
        public InterviewMode InterviewMode { get; set; } = InterviewMode.Online;
        public string? InterviewLink { get; set; }
        public string? InterviewVenue { get; set; }
        public string? InterviewDetails { get; set; }
    }

    [HttpPatch("{id}/schedule-interview")]
    [HttpPost("{id}/schedule-interview")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult> ScheduleInterview(Guid id, [FromBody] ScheduleInterviewRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var application = await _context.JobApplications
            .Include(a => a.Job)
            .ThenInclude(j => j.Institution)
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(a => a.Id == id && a.Job.RecruiterId == recruiter.Id);
            
        if (application == null) return NotFound("Application not found or no permission.");

        application.Status = ApplicationStatus.InterviewScheduled;
        application.InterviewDate = request.InterviewDate;
        application.InterviewMode = request.InterviewMode;
        application.InterviewLink = request.InterviewMode == InterviewMode.Online ? request.InterviewLink : null;
        application.InterviewVenue = request.InterviewMode == InterviewMode.InPerson ? request.InterviewVenue : null;
        application.InterviewDetails = request.InterviewDetails;
        
        await _context.SaveChangesAsync();

        var institutionName = application.Job.Institution?.Name ?? "Institution";
        var candidateName = $"{application.Candidate.User.FirstName} {application.Candidate.User.LastName}".Trim();
        var interviewDateIst = ToIst(request.InterviewDate);

        // Dispatch push notification asynchronously
        _ = _pushService.SendPushNotificationAsync(
            application.Candidate.UserId,
            "Interview Scheduled!",
            $"An interview for '{application.Job.Title}' is scheduled on {interviewDateIst:dd-MM-yyyy, hh:mm tt} IST."
        );

        // Generate ICS Calendar Invite
        string locationOrLink = request.InterviewMode switch
        {
            InterviewMode.Online => !string.IsNullOrWhiteSpace(request.InterviewLink) ? request.InterviewLink : "Online Video Call",
            InterviewMode.InPerson => !string.IsNullOrWhiteSpace(request.InterviewVenue) ? request.InterviewVenue : (application.Job.Location ?? "On-site Venue"),
            InterviewMode.Telephonic => !string.IsNullOrWhiteSpace(request.InterviewDetails) ? $"Telephonic: {request.InterviewDetails}" : "Telephonic Interview",
            _ => "TBD"
        };

        var icsDescription = $"Interview for {application.Job.Title} at {institutionName}\n" +
                             $"Date & Time: {interviewDateIst:dd-MM-yyyy, hh:mm tt} IST\n" +
                             $"Mode: {request.InterviewMode}\n" +
                             (!string.IsNullOrWhiteSpace(request.InterviewLink) ? $"Meeting Link: {request.InterviewLink}\n" : "") +
                             (!string.IsNullOrWhiteSpace(request.InterviewVenue) ? $"Venue: {request.InterviewVenue}\n" : "") +
                             (!string.IsNullOrWhiteSpace(request.InterviewDetails) ? $"Details/Instructions: {request.InterviewDetails}\n" : "");

        var icsContent = _calendarService.GenerateIcsContent(
            eventId: application.Id.ToString(),
            title: $"Interview: {application.Job.Title} - {institutionName}",
            description: icsDescription,
            locationOrLink: locationOrLink,
            startDateTimeUtc: request.InterviewDate,
            durationMinutes: 45,
            organizerName: institutionName,
            method: "REQUEST"
        );

        byte[] icsBytes = Encoding.UTF8.GetBytes(icsContent);

        if (!string.IsNullOrWhiteSpace(application.Candidate.User?.Email))
        {
            var emailHtml = BuildInterviewScheduledEmailHtml(
                candidateName: candidateName,
                jobTitle: application.Job.Title,
                institutionName: institutionName,
                interviewDate: request.InterviewDate,
                mode: request.InterviewMode,
                meetingLink: request.InterviewLink,
                venue: request.InterviewVenue,
                details: request.InterviewDetails
            );

            _ = _notificationService.SendEmailAsync(
                to: application.Candidate.User.Email,
                subject: $"Interview Scheduled: {application.Job.Title} - {institutionName}",
                body: emailHtml,
                isHtml: true,
                attachmentBytes: icsBytes,
                attachmentFilename: $"interview_{application.Id.ToString().Substring(0, 8)}.ics",
                attachmentContentType: "text/calendar",
                emailType: EmailType.Default
            );
        }

        return NoContent();
    }

    [HttpGet("{id}/interview.ics")]
    [HttpGet("/jobapplications/{id}/interview.ics")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadInterviewCalendar(Guid id)
    {
        var application = await _context.JobApplications
            .Include(a => a.Job)
            .ThenInclude(j => j.Institution)
            .Include(a => a.Candidate)
            .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (application == null || !application.InterviewDate.HasValue)
        {
            return NotFound("Interview not found or not yet scheduled.");
        }

        var institutionName = application.Job?.Institution?.Name ?? "Institution";
        var jobTitle = application.Job?.Title ?? "Interview";
        var interviewDateIst = ToIst(application.InterviewDate.Value);
        string locationOrLink = application.InterviewMode switch
        {
            InterviewMode.Online => !string.IsNullOrWhiteSpace(application.InterviewLink) ? application.InterviewLink : "Online Video Call",
            InterviewMode.InPerson => !string.IsNullOrWhiteSpace(application.InterviewVenue) ? application.InterviewVenue : (application.Job?.Location ?? "On-site Venue"),
            InterviewMode.Telephonic => !string.IsNullOrWhiteSpace(application.InterviewDetails) ? $"Telephonic: {application.InterviewDetails}" : "Telephonic Interview",
            _ => application.InterviewLink ?? application.Job?.Location ?? "TBD"
        };

        var icsDescription = $"Interview for {jobTitle} at {institutionName}\n" +
                             $"Date & Time: {interviewDateIst:dd-MM-yyyy, hh:mm tt} IST\n" +
                             $"Mode: {application.InterviewMode?.ToString() ?? "Scheduled"}\n" +
                             (!string.IsNullOrWhiteSpace(application.InterviewLink) ? $"Meeting Link: {application.InterviewLink}\n" : "") +
                             (!string.IsNullOrWhiteSpace(application.InterviewVenue) ? $"Venue: {application.InterviewVenue}\n" : "") +
                             (!string.IsNullOrWhiteSpace(application.InterviewDetails) ? $"Details/Instructions: {application.InterviewDetails}\n" : "");

        var icsContent = _calendarService.GenerateIcsContent(
            eventId: application.Id.ToString(),
            title: $"Interview: {jobTitle} - {institutionName}",
            description: icsDescription,
            locationOrLink: locationOrLink,
            startDateTimeUtc: application.InterviewDate.Value,
            durationMinutes: 45,
            organizerName: institutionName,
            method: "PUBLISH"
        );

        var bytes = Encoding.UTF8.GetBytes(icsContent);
        return File(bytes, "text/calendar; charset=utf-8", $"interview_{application.Id.ToString().Substring(0, 8)}.ics");
    }

    private static string BuildStatusUpdateEmailHtml(
        string candidateName,
        string jobTitle,
        string institutionName,
        string? location,
        ApplicationStatus newStatus,
        string? note)
    {
        var (statusBadgeText, badgeBg, badgeColor, headline, message) = newStatus switch
        {
            ApplicationStatus.UnderReview => (
                "Under Review", "#fef3c7", "#92400e",
                "Your Application is Under Review",
                $"Your job application for <strong>{jobTitle}</strong> at <strong>{institutionName}</strong> is currently being reviewed by our recruiting team. We will keep you updated as your profile progresses."
            ),
            ApplicationStatus.Shortlisted => (
                "Shortlisted", "#e0e7ff", "#3730a3",
                "Congratulations! You Have Been Shortlisted",
                $"We are pleased to inform you that your profile has been shortlisted for the role of <strong>{jobTitle}</strong> at <strong>{institutionName}</strong>! Our recruitment team will be in touch shortly regarding next steps."
            ),
            ApplicationStatus.Offered => (
                "Job Offer Extended", "#d1fae5", "#065f46",
                "Congratulations on Your Job Offer!",
                $"We are thrilled to share that <strong>{institutionName}</strong> has extended a formal job offer for the position of <strong>{jobTitle}</strong>! Please log into your EduKey360 candidate portal to review your offer details."
            ),
            ApplicationStatus.Hired => (
                "Hired", "#dcfce7", "#166534",
                "Welcome Aboard - You are Hired!",
                $"Congratulations and welcome aboard! Your hire for <strong>{jobTitle}</strong> at <strong>{institutionName}</strong> has been officially confirmed. Wishing you great success in this exciting role!"
            ),
            ApplicationStatus.Rejected => (
                "Update on Your Application", "#f1f5f9", "#475569",
                "Update Regarding Your Application",
                $"Thank you for your interest in the <strong>{jobTitle}</strong> position at <strong>{institutionName}</strong> and for taking the time to apply. After careful evaluation, the hiring team has decided to proceed with candidates whose qualifications more closely align with the immediate requirements of this role. We strongly encourage you to explore and apply for other opportunities matching your skills on EduKey360."
            ),
            _ => (
                newStatus.ToString(), "#e2e8f0", "#1e293b",
                "Application Status Update",
                $"The status of your application for <strong>{jobTitle}</strong> at <strong>{institutionName}</strong> has been updated to <strong>{newStatus}</strong>."
            )
        };

        var noteHtml = !string.IsNullOrWhiteSpace(note)
            ? $@"<div style='margin-top: 20px; padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px;'>
                   <div style='font-size: 13px; font-weight: bold; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;'>Note from Hiring Team:</div>
                   <div style='margin-top: 6px; font-size: 14px; color: #334155;'>{note}</div>
                 </div>"
            : "";

        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Application Status Update</title>
</head>
<body style='margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;'>
  <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
    
    <!-- Header Banner -->
    <div style='background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 28px 32px; color: #ffffff;'>
      <div style='font-size: 22px; font-weight: bold; letter-spacing: 0.5px;'>EduKey360</div>
      <div style='font-size: 13px; opacity: 0.9; margin-top: 4px;'>Education & Institutional Careers Portal</div>
    </div>

    <!-- Body Content -->
    <div style='padding: 32px;'>
      <div style='display: inline-block; padding: 6px 14px; background-color: {badgeBg}; color: {badgeColor}; font-size: 13px; font-weight: 700; border-radius: 9999px; margin-bottom: 16px;'>
        {statusBadgeText}
      </div>

      <h2 style='margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;'>{headline}</h2>
      
      <p style='font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;'>
        Dear <strong>{candidateName}</strong>,
      </p>

      <p style='font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;'>
        {message}
      </p>

      <!-- Job Card -->
      <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;'>
        <div style='font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;'>Application Summary</div>
        <div style='font-size: 17px; font-weight: bold; color: #1e293b; margin-top: 4px;'>{jobTitle}</div>
        <div style='font-size: 14px; color: #475569; margin-top: 4px;'>🏢 {institutionName}</div>
        {(!string.IsNullOrWhiteSpace(location) ? $"<div style='font-size: 13px; color: #64748b; margin-top: 4px;'>📍 {location}</div>" : "")}
      </div>

      {noteHtml}

      <div style='margin-top: 32px; text-align: center;'>
        <a href='https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io/candidate/applications' 
           style='display: inline-block; padding: 12px 28px; background-color: #0f766e; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.3);'>
          View Application Status
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style='background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;'>
      This application update was sent by EduKey360 on behalf of {institutionName}.<br>
      For questions or support, reach us at <a href='mailto:support@edukey360.com' style='color: #0f766e; text-decoration: underline;'>support@edukey360.com</a>.<br>
      <a href='https://www.edukey360.com' style='color: #64748b; text-decoration: none;'>www.edukey360.com</a>
    </div>

  </div>
</body>
</html>";
    }

    private static string BuildInterviewScheduledEmailHtml(
        string candidateName,
        string jobTitle,
        string institutionName,
        DateTime interviewDate,
        InterviewMode mode,
        string? meetingLink,
        string? venue,
        string? details)
    {
        var interviewDateIst = ToIst(interviewDate);
        var modeBadge = mode switch
        {
            InterviewMode.Online => ("🌐 Online Video Meeting", "#dbeafe", "#1e40af"),
            InterviewMode.InPerson => ("🏢 In-Person (On-Site Venue)", "#dcfce7", "#166534"),
            InterviewMode.Telephonic => ("📞 Telephonic Interview", "#fef3c7", "#92400e"),
            _ => ("Interview", "#f1f5f9", "#475569")
        };

        var modeSpecificSection = "";
        if (mode == InterviewMode.Online && !string.IsNullOrWhiteSpace(meetingLink))
        {
            modeSpecificSection = $@"
              <div style='margin-top: 16px; padding: 14px 18px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;'>
                <div style='font-size: 13px; font-weight: bold; color: #1e40af; margin-bottom: 6px;'>🔗 Meeting Link</div>
                <div style='margin-bottom: 12px;'>
                  <a href='{meetingLink}' target='_blank' style='display: inline-block; padding: 10px 20px; background-color: #0f766e; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;'>Join Video Interview</a>
                </div>
                <div style='font-size: 12px; color: #4b5563; word-break: break-all;'>Direct URL: <a href='{meetingLink}' style='color: #0f766e;'>{meetingLink}</a></div>
              </div>";
        }
        else if (mode == InterviewMode.InPerson && !string.IsNullOrWhiteSpace(venue))
        {
            modeSpecificSection = $@"
              <div style='margin-top: 16px; padding: 14px 18px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;'>
                <div style='font-size: 13px; font-weight: bold; color: #166534; margin-bottom: 6px;'>🏢 Interview Venue / Campus Location</div>
                <div style='font-size: 14px; color: #1f2937; line-height: 1.5; font-weight: 500;'>{venue}</div>
              </div>";
        }
        else if (mode == InterviewMode.Telephonic)
        {
            modeSpecificSection = $@"
              <div style='margin-top: 16px; padding: 14px 18px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;'>
                <div style='font-size: 13px; font-weight: bold; color: #92400e; margin-bottom: 6px;'>📞 Telephonic Interview Details</div>
                <div style='font-size: 14px; color: #1f2937; line-height: 1.5;'>The interviewer will contact you on your registered mobile number, or as per the instructions below. Please ensure your phone is reachable.</div>
              </div>";
        }

        var detailsHtml = !string.IsNullOrWhiteSpace(details)
            ? $@"<div style='margin-top: 16px; padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid #0f766e; border-radius: 6px;'>
                   <div style='font-size: 13px; font-weight: bold; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;'>Recruiter Instructions & Notes:</div>
                   <div style='margin-top: 6px; font-size: 14px; color: #334155; line-height: 1.5;'>{details}</div>
                 </div>"
            : "";

        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Interview Scheduled</title>
</head>
<body style='margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;'>
  <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
    
    <!-- Header Banner -->
    <div style='background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 28px 32px; color: #ffffff;'>
      <div style='font-size: 22px; font-weight: bold; letter-spacing: 0.5px;'>EduKey360</div>
      <div style='font-size: 13px; opacity: 0.9; margin-top: 4px;'>Interview Invitation</div>
    </div>

    <!-- Body Content -->
    <div style='padding: 32px;'>
      <div style='display: inline-block; padding: 6px 14px; background-color: {modeBadge.Item2}; color: {modeBadge.Item3}; font-size: 13px; font-weight: 700; border-radius: 9999px; margin-bottom: 16px;'>
        {modeBadge.Item1}
      </div>

      <h2 style='margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;'>Interview Scheduled: {jobTitle}</h2>
      
      <p style='font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;'>
        Dear <strong>{candidateName}</strong>,
      </p>

      <p style='font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;'>
        We are pleased to inform you that your interview for <strong>{jobTitle}</strong> at <strong>{institutionName}</strong> has been scheduled. Please find the complete details below:
      </p>

      <!-- Interview Card -->
      <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;'>
        <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
          <tr>
            <td style='padding: 6px 0; color: #64748b; width: 140px; font-weight: 500;'>Position:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{jobTitle}</td>
          </tr>
          <tr>
            <td style='padding: 6px 0; color: #64748b; font-weight: 500;'>Institution:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{institutionName}</td>
          </tr>
          <tr>
            <td style='padding: 6px 0; color: #64748b; font-weight: 500;'>Date & Time:</td>
            <td style='padding: 6px 0; color: #0f766e; font-weight: 700;'>{interviewDateIst:dd-MM-yyyy, hh:mm tt} IST</td>
          </tr>
          <tr>
            <td style='padding: 6px 0; color: #64748b; font-weight: 500;'>Interview Mode:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{mode}</td>
          </tr>
        </table>

        {modeSpecificSection}
      </div>

      {detailsHtml}

      <!-- Calendar Invite Notice -->
      <div style='margin-top: 20px; padding: 12px 16px; background-color: #f0fdfa; border-radius: 8px; font-size: 13px; color: #134e4a; border: 1px solid #ccfbf1;'>
        📅 <strong>Calendar Invite Attached:</strong> A <code>.ics</code> calendar file is attached to this email. You can tap it to add this interview directly to your Google Calendar, Outlook, or Apple Calendar in Indian Standard Time (IST).
      </div>

      <div style='margin-top: 32px; text-align: center;'>
        <a href='https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io/candidate/applications' 
           style='display: inline-block; padding: 12px 28px; background-color: #0f766e; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.3);'>
          Open Candidate Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style='background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;'>
      This interview invitation was sent from EduKey360 on behalf of {institutionName}.<br>
      For questions or assistance, please contact your recruiter or reach us at <a href='mailto:support@edukey360.com' style='color: #0f766e; text-decoration: underline;'>support@edukey360.com</a>.<br>
      <a href='https://www.edukey360.com' style='color: #64748b; text-decoration: none;'>www.edukey360.com</a>
    </div>

  </div>
</body>
</html>";
    }

    private static DateTime ToIst(DateTime utcDateTime)
    {
        try
        {
            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc), istZone);
        }
        catch
        {
            try
            {
                var istZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc), istZone);
            }
            catch
            {
                return DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc).AddMinutes(330);
            }
        }
    }
}
