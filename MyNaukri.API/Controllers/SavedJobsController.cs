using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Domain.Entities;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Candidate")]
public class SavedJobsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SavedJobsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SavedJobDto>>> GetSavedJobs()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return StatusCode(403, "User is not registered as a candidate.");

        var savedJobs = await _context.SavedJobs
            .Include(s => s.Job)
            .ThenInclude(j => j.Institution)
            .Where(s => s.CandidateId == candidate.Id)
            .Select(s => new SavedJobDto
            {
                Id = s.Id,
                CandidateId = s.CandidateId,
                JobId = s.JobId,
                CreatedAt = s.CreatedAt,
                JobTitle = s.Job.Title,
                JobLocation = s.Job.Location,
                CompanyName = s.Job.Institution != null ? s.Job.Institution.Name : "Company Name placeholder",
                MinSalary = s.Job.MinSalary,
                MaxSalary = s.Job.MaxSalary,
                IsActive = s.Job.IsActive
            })
            .ToListAsync();

        return Ok(savedJobs);
    }

    [HttpPost("{jobId}")]
    public async Task<ActionResult> ToggleSaveJob(Guid jobId)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return StatusCode(403, "User is not registered as a candidate.");

        var job = await _context.Jobs.FindAsync(jobId);
        if (job == null) return NotFound("Job not found.");

        var existingSave = await _context.SavedJobs
            .FirstOrDefaultAsync(s => s.JobId == jobId && s.CandidateId == candidate.Id);

        if (existingSave != null)
        {
            _context.SavedJobs.Remove(existingSave);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Job unsaved successfully.", Saved = false });
        }
        else
        {
            var savedJob = new SavedJob
            {
                CandidateId = candidate.Id,
                JobId = jobId
            };
            _context.SavedJobs.Add(savedJob);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Job saved successfully.", Saved = true });
        }
    }
}
