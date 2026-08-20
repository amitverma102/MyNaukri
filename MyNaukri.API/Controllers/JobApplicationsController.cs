using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class JobApplicationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public JobApplicationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("apply/{jobId}")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult> ApplyToJob(Guid jobId)
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

        var application = new JobApplication
        {
            JobId = jobId,
            CandidateId = candidate.Id,
            Status = ApplicationStatus.Applied
        };

        _context.JobApplications.Add(application);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Applied successfully." });
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
                InterviewLink = a.InterviewLink,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                JobTitle = a.Job.Title
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
                InterviewLink = a.InterviewLink,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                JobTitle = a.Job.Title
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("job/{jobId}")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
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
                InterviewLink = a.InterviewLink,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                JobTitle = job.Title
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("interviews")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
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
                InterviewLink = a.InterviewLink,
                CandidateName = $"{a.Candidate.User.FirstName} {a.Candidate.User.LastName}",
                CandidateEmail = a.Candidate.User.Email,
                JobTitle = a.Job.Title
            })
            .ToListAsync();

        return Ok(applications);
    }

    public class UpdateStatusRequest
    {
        public ApplicationStatus Status { get; set; }
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> UpdateApplicationStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var application = await _context.JobApplications
            .Include(a => a.Job)
            .FirstOrDefaultAsync(a => a.Id == id && a.Job.RecruiterId == recruiter.Id);
            
        if (application == null) return NotFound("Application not found or no permission.");

        application.Status = request.Status;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    public class ScheduleInterviewRequest
    {
        public DateTime InterviewDate { get; set; }
        public string InterviewLink { get; set; } = string.Empty;
    }

    [HttpPatch("{id}/schedule-interview")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> ScheduleInterview(Guid id, [FromBody] ScheduleInterviewRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var application = await _context.JobApplications
            .Include(a => a.Job)
            .FirstOrDefaultAsync(a => a.Id == id && a.Job.RecruiterId == recruiter.Id);
            
        if (application == null) return NotFound("Application not found or no permission.");

        application.Status = ApplicationStatus.InterviewScheduled;
        application.InterviewDate = request.InterviewDate;
        application.InterviewLink = request.InterviewLink;
        
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
