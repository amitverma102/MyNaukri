using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Recruiters;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Domain.Entities;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Recruiter")]
public class RecruitersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RecruitersController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("profile")]
    public async Task<ActionResult<RecruiterProfileDto>> GetProfile()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters
            .Include(r => r.User)
            .Include(r => r.Institution)
            .FirstOrDefaultAsync(r => r.UserId == userId);

        if (recruiter == null)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            return Ok(new RecruiterProfileDto
            {
                Id = Guid.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Designation = "",
                CompanyName = ""
            });
        }

        return Ok(new RecruiterProfileDto
        {
            Id = recruiter.Id,
            FirstName = recruiter.User.FirstName,
            LastName = recruiter.User.LastName,
            Email = recruiter.User.Email,
            Designation = recruiter.Designation,
            CompanyName = recruiter.Institution?.Name ?? string.Empty
        });
    }

    [HttpPost("profile")]
    public async Task<ActionResult> UpdateProfile([FromBody] UpdateRecruiterProfileDto request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        
        Institution? institution = null;
        if (!string.IsNullOrWhiteSpace(request.CompanyName))
        {
            institution = await _context.Institutions.FirstOrDefaultAsync(i => i.Name == request.CompanyName);
            if (institution == null)
            {
                institution = new Institution { Name = request.CompanyName };
                _context.Institutions.Add(institution);
                await _context.SaveChangesAsync(); // Save to generate ID
            }
        }

        if (recruiter == null)
        {
            recruiter = new Recruiter
            {
                UserId = userId,
                Designation = request.Designation ?? "",
            };
            if (institution != null) recruiter.InstitutionId = institution.Id;
            _context.Recruiters.Add(recruiter);
        }
        else
        {
            recruiter.Designation = request.Designation ?? recruiter.Designation;
            if (institution != null) recruiter.InstitutionId = institution.Id;
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Profile updated successfully." });
    }

    [HttpGet("candidates/search")]
    public async Task<ActionResult<IEnumerable<CandidateProfileDto>>> SearchCandidates([FromQuery] string q)
    {
        var query = _context.Candidates.Include(c => c.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var searchStr = q.ToLower();
            query = query.Where(c => 
                c.Skills.ToLower().Contains(searchStr) || 
                c.Summary.ToLower().Contains(searchStr) || 
                c.ClassesTaught.ToLower().Contains(searchStr) ||
                c.BoardsTaught.ToLower().Contains(searchStr) ||
                c.User.FirstName.ToLower().Contains(searchStr) ||
                c.User.LastName.ToLower().Contains(searchStr)
            );
        }

        var results = await query.Select(candidate => new CandidateProfileDto
        {
            Id = candidate.Id,
            FirstName = candidate.User.FirstName,
            LastName = candidate.User.LastName,
            Email = candidate.User.Email,
            PhoneNumber = candidate.PhoneNumber,
            ResumeUrl = candidate.ResumeUrl,
            Skills = candidate.Skills,
            Summary = candidate.Summary,
            TotalExperienceYears = candidate.TotalExperienceYears,
            CurrentLocation = candidate.CurrentLocation,
            ClassesTaught = candidate.ClassesTaught,
            BoardsTaught = candidate.BoardsTaught,
            Education = candidate.Education
        }).ToListAsync();

        return Ok(results);
    }
}
