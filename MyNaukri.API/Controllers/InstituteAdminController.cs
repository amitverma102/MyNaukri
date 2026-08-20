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

    [HttpGet("recruiters")]
    public async Task<IActionResult> GetRecruiters()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var recruiters = await _context.Recruiters
            .Include(r => r.User)
            .Where(r => r.InstitutionId == institutionId.Value)
            .Select(r => new {
                r.Id,
                r.User.FirstName,
                r.User.LastName,
                r.User.Email,
                r.Credits
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
            Credits = 0
        };
        
        _context.Recruiters.Add(recruiter);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Recruiter created successfully.", recruiterId = recruiter.Id });
    }
}

public class CreateRecruiterDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
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
