using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdministrator")] // Or equivalent SuperAdmin role
public class EduTechAdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInstitutionCreditService _institutionCreditService;

    public EduTechAdminController(ApplicationDbContext context, IInstitutionCreditService institutionCreditService)
    {
        _context = context;
        _institutionCreditService = institutionCreditService;
    }

    [HttpGet("institutions")]
    public async Task<IActionResult> GetInstitutions()
    {
        var institutions = await _context.Institutions
            .Select(i => new {
                i.Id,
                i.Name,
                i.Type,
                i.Status,
                WalletBalance = _context.InstitutionCreditWallets.Where(w => w.InstitutionId == i.Id).Select(w => w.AvailableCredits).FirstOrDefault()
            })
            .ToListAsync();
            
        return Ok(institutions);
    }

    [HttpPost("institutions/{institutionId}/credits/issue")]
    public async Task<IActionResult> IssueCredits(Guid institutionId, [FromBody] IssueCreditsDto dto)
    {
        if (dto.Credits <= 0) return BadRequest("Credits must be greater than zero.");
        
        var adminIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(adminIdStr, out var adminId)) return Unauthorized();

        var success = await _institutionCreditService.AdminAddCreditsAsync(institutionId, dto.Credits, adminId, dto.Reason);
        if (!success) return BadRequest("Failed to issue credits.");

        return Ok(new { message = "Credits issued successfully." });
    }
}

public class IssueCreditsDto
{
    public int Credits { get; set; }
    public string Reason { get; set; } = string.Empty;
}
