using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Domain.Entities;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/job-applications")]
public class JobApplicationCommentController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public JobApplicationCommentController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id}/comments")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult<IEnumerable<JobApplicationCommentDto>>> GetComments(Guid id)
    {
        var application = await _context.JobApplications
            .Include(a => a.Job)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (application == null) return NotFound();

        // Check auth (assuming recruiter owns the job)
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var userId))
        {
            var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
            if (recruiter != null && application.Job.RecruiterId != recruiter.Id)
            {
                return Forbid();
            }
        }

        var comments = await _context.JobApplicationComments
            .Where(c => c.JobApplicationId == id && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new JobApplicationCommentDto
            {
                Id = c.Id,
                JobApplicationId = c.JobApplicationId,
                UserId = c.UserId,
                Comment = c.Comment,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("{id}/comments")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult<JobApplicationCommentDto>> AddComment(Guid id, [FromBody] CreateJobApplicationCommentDto dto)
    {
        var application = await _context.JobApplications
            .Include(a => a.Job)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (application == null) return NotFound();

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter != null && application.Job.RecruiterId != recruiter.Id)
        {
            return Forbid();
        }

        var comment = new JobApplicationComment
        {
            JobApplicationId = id,
            UserId = userId,
            Comment = dto.Comment
        };

        _context.JobApplicationComments.Add(comment);
        await _context.SaveChangesAsync();

        return Ok(new JobApplicationCommentDto
        {
            Id = comment.Id,
            JobApplicationId = comment.JobApplicationId,
            UserId = comment.UserId,
            Comment = comment.Comment,
            CreatedAt = comment.CreatedAt
        });
    }

    [HttpPut("/api/job-application-comments/{id}")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> UpdateComment(Guid id, [FromBody] CreateJobApplicationCommentDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var comment = await _context.JobApplicationComments.FindAsync(id);
        if (comment == null || comment.IsDeleted) return NotFound();

        if (comment.UserId != userId) return Forbid(); // Only the author can edit

        comment.Comment = dto.Comment;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("/api/job-application-comments/{id}")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> DeleteComment(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var comment = await _context.JobApplicationComments.FindAsync(id);
        if (comment == null || comment.IsDeleted) return NotFound();

        if (comment.UserId != userId) return Forbid(); // Only the author can delete

        comment.IsDeleted = true;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
