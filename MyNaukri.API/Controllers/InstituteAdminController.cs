using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/instituteadmin")]
[Authorize(Roles = "InstituteAdministrator")]
public class InstituteAdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInstitutionCreditService _institutionCreditService;

    public InstituteAdminController(ApplicationDbContext context, IInstitutionCreditService institutionCreditService)
    {
        _context = context;
        _institutionCreditService = institutionCreditService;
    }

    private async Task<Guid?> GetInstitutionIdAsync(Guid userId)
    {
        var profile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        return profile?.InstitutionId;
    }

    [HttpGet("wallet")]
    public async Task<IActionResult> GetWallet()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid("User is not associated with any institution.");

        var wallet = await _institutionCreditService.GetWalletAsync(institutionId.Value);
        return Ok(wallet ?? new InstitutionCreditWallet { InstitutionId = institutionId.Value });
    }

    [HttpPost("wallet/purchase")]
    public async Task<IActionResult> PurchaseCredits([FromBody] PurchaseCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var purchase = await _institutionCreditService.PurchaseCreditsAsync(institutionId.Value, dto.Credits, userId);
        return Ok(new { message = "Credits purchased successfully.", purchase });
    }

    [HttpGet("recruiters/summary")]
    public async Task<IActionResult> GetRecruitersSummary()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var institution = await _context.Institutions.FindAsync(institutionId.Value);
        if (institution == null) return Forbid();

        var currentRecruiters = await _context.Recruiters
            .Include(r => r.User)
            .CountAsync(r => r.InstitutionId == institutionId.Value && r.User.IsActive);

        var availableSlots = Math.Max(0, institution.MaxRecruiters - currentRecruiters);
        
        return Ok(new
        {
            maxRecruiters = institution.MaxRecruiters,
            currentRecruiters,
            availableSlots,
            canCreateRecruiter = availableSlots > 0
        });
    }

    [HttpGet("recruiters")]
    public async Task<IActionResult> GetRecruiters([FromQuery] string? search, [FromQuery] string? status)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var query = _context.Recruiters
            .Include(r => r.User)
            .Where(r => r.InstitutionId == institutionId.Value)
            .AsQueryable();
            
        if (!string.IsNullOrEmpty(status))
        {
            if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => r.User.IsActive);
            else if (status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => !r.User.IsActive);
        }

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(r => r.User.FirstName.ToLower().Contains(s) || 
                                     r.User.LastName.ToLower().Contains(s) || 
                                     r.User.Email.ToLower().Contains(s) ||
                                     r.Mobile.Contains(s));
        }

        var recruiters = await query
            .Select(r => new {
                r.Id,
                r.User.FirstName,
                r.User.LastName,
                r.User.Email,
                r.Mobile,
                r.Designation,
                r.Department,
                r.Credits,
                r.User.IsActive,
                r.CreatedAt
            })
            .ToListAsync();
            
        return Ok(recruiters);
    }

    [HttpPost("recruiters/{recruiterId}/allocate")]
    public async Task<IActionResult> AllocateCredits(Guid recruiterId, [FromBody] AllocateCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var success = await _institutionCreditService.AllocateToRecruiterAsync(institutionId.Value, recruiterId, dto.Credits, userId, dto.Reason);
        if (!success) return BadRequest("Failed to allocate credits. Check institution balance and recruiter validity.");

        return Ok(new { message = "Credits allocated successfully." });
    }

    [HttpPost("recruiters/{recruiterId}/revoke")]
    public async Task<IActionResult> RevokeCredits(Guid recruiterId, [FromBody] AllocateCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var success = await _institutionCreditService.RevokeFromRecruiterAsync(institutionId.Value, recruiterId, dto.Credits, userId, dto.Reason);
        if (!success) return BadRequest("Failed to revoke credits. Check recruiter balance and validity.");

        return Ok(new { message = "Credits revoked successfully." });
    }

    [HttpPost("recruiters/transfer")]
    public async Task<IActionResult> TransferCredits([FromBody] TransferCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var success = await _institutionCreditService.TransferBetweenRecruitersAsync(institutionId.Value, dto.FromRecruiterId, dto.ToRecruiterId, dto.Credits, userId, dto.Reason);
        if (!success) return BadRequest("Failed to transfer credits.");

        return Ok(new { message = "Credits transferred successfully." });
    }

    [HttpPost("recruiters")]
    public async Task<IActionResult> CreateRecruiter([FromBody] CreateRecruiterDto dto, [FromServices] MyNaukri.Application.Interfaces.IPasswordHasher passwordHasher)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var institution = await _context.Institutions.FindAsync(institutionId.Value);
            if (institution == null) return Forbid();

            var currentRecruiters = await _context.Recruiters
                .Include(r => r.User)
                .CountAsync(r => r.InstitutionId == institutionId.Value && r.User.IsActive);
                
            if (currentRecruiters >= institution.MaxRecruiters)
            {
                return Conflict(new {
                    code = "MAX_RECRUITER_LIMIT_REACHED",
                    message = "Your institution has reached its maximum recruiter limit.",
                    maxRecruiters = institution.MaxRecruiters,
                    currentRecruiters = currentRecruiters,
                    availableSlots = 0
                });
            }

            var emailLower = dto.Email.ToLower();
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailLower))
            {
                return BadRequest("Email already exists.");
            }

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PasswordHash = passwordHasher.Hash(dto.Password),
                Role = Role.Recruiter,
                IsEmailVerified = true, // Auto-verified since created by admin
                VerificationOtp = string.Empty,
                VerificationOtpExpiry = DateTime.UtcNow
            };

            _context.Users.Add(user);
            
            var recruiter = new Recruiter
            {
                UserId = user.Id,
                InstitutionId = institutionId.Value,
                Designation = dto.Designation,
                Mobile = dto.Mobile,
                Department = dto.Department,
                Credits = 0
            };
            
            _context.Recruiters.Add(recruiter);
            
            var creditRate = new RecruiterCreditRate
            {
                Recruiter = recruiter,
                ResumeDownloadRate = 5,
                ContactViewRate = 2,
                BulkProfileDownloadRate = 2,
                NormalJobPostingRate = 20,
                PlatinumJobPostingRate = 40,
                CandidateEmailRate = 3
            };
            _context.RecruiterCreditRates.Add(creditRate);
            
            _context.AuditLogs.Add(new AuditLog {
                Action = "CREATE_RECRUITER",
                PerformedByUserId = userId,
                Role = Role.InstituteAdministrator,
                InstitutionId = institutionId.Value,
                Details = $"Created recruiter {dto.Email}"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Recruiter created successfully.", recruiterId = recruiter.Id });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "An error occurred while creating the recruiter.");
        }
    }

    [HttpPut("recruiters/{id}")]
    public async Task<IActionResult> UpdateRecruiter(Guid id, [FromBody] UpdateRecruiterDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var recruiter = await _context.Recruiters
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id && r.InstitutionId == institutionId.Value);

        if (recruiter == null) return NotFound("Recruiter not found.");

        recruiter.User.FirstName = dto.FirstName;
        recruiter.User.LastName = dto.LastName;
        recruiter.Mobile = dto.Mobile;
        recruiter.Designation = dto.Designation;
        recruiter.Department = dto.Department;

        _context.AuditLogs.Add(new AuditLog {
            Action = "UPDATE_RECRUITER",
            PerformedByUserId = userId,
            Role = Role.InstituteAdministrator,
            InstitutionId = institutionId.Value,
            Details = $"Updated recruiter {recruiter.User.Email}"
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Recruiter updated successfully." });
    }

    [HttpDelete("recruiters/{id}")]
    public async Task<IActionResult> DeactivateRecruiter(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var recruiter = await _context.Recruiters
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id && r.InstitutionId == institutionId.Value);

        if (recruiter == null) return NotFound("Recruiter not found.");

        if (!recruiter.User.IsActive) return BadRequest("Recruiter is already inactive.");

        recruiter.User.IsActive = false;

        _context.AuditLogs.Add(new AuditLog {
            Action = "DEACTIVATE_RECRUITER",
            PerformedByUserId = userId,
            Role = Role.InstituteAdministrator,
            InstitutionId = institutionId.Value,
            Details = $"Deactivated recruiter {recruiter.User.Email}"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Recruiter deactivated successfully." });
    }

    [HttpPost("recruiters/{id}/reactivate")]
    public async Task<IActionResult> ReactivateRecruiter(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var institution = await _context.Institutions.FindAsync(institutionId.Value);
            if (institution == null) return Forbid();

            var recruiter = await _context.Recruiters
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Id == id && r.InstitutionId == institutionId.Value);

            if (recruiter == null) return NotFound("Recruiter not found.");

            if (recruiter.User.IsActive) return BadRequest("Recruiter is already active.");

            var currentRecruiters = await _context.Recruiters
                .Include(r => r.User)
                .CountAsync(r => r.InstitutionId == institutionId.Value && r.User.IsActive);

            if (currentRecruiters >= institution.MaxRecruiters)
            {
                return Conflict(new {
                    code = "MAX_RECRUITER_LIMIT_REACHED",
                    message = "Cannot reactivate this recruiter because your institution has reached its maximum recruiter limit."
                });
            }

            recruiter.User.IsActive = true;

            _context.AuditLogs.Add(new AuditLog {
                Action = "REACTIVATE_RECRUITER",
                PerformedByUserId = userId,
                Role = Role.InstituteAdministrator,
                InstitutionId = institutionId.Value,
                Details = $"Reactivated recruiter {recruiter.User.Email}"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Recruiter reactivated successfully." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "An error occurred while reactivating the recruiter.");
        }
    }
}

public class CreateRecruiterDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
}

public class UpdateRecruiterDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
}

public class PurchaseCreditsDto
{
    public int Credits { get; set; }
}

public class AllocateCreditsDto
{
    public int Credits { get; set; }
    public string? Reason { get; set; }
}

public class TransferCreditsDto
{
    public Guid FromRecruiterId { get; set; }
    public Guid ToRecruiterId { get; set; }
    public int Credits { get; set; }
    public string? Reason { get; set; }
}
