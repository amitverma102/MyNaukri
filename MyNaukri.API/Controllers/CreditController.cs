using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Credits;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/recruiter/credits")]
[Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
public class CreditController : ControllerBase
{
    private readonly ICreditService _creditService;
    private readonly ApplicationDbContext _context;

    public CreditController(ICreditService creditService, ApplicationDbContext context)
    {
        _creditService = creditService;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetBalanceAndRates()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var balance = await _creditService.GetBalanceAsync(recruiter.Id);
        var rates = await _creditService.GetRatesAsync(recruiter.Id);

        return Ok(new
        {
            AvailableCredits = balance,
            Rates = new CreditRateDto
            {
                ResumeDownloadRate = rates.ResumeDownloadRate ?? 5,
                ContactViewRate = rates.ContactViewRate ?? 2,
                BulkProfileDownloadRate = rates.BulkProfileDownloadRate ?? 2,
                NormalJobPostingRate = rates.NormalJobPostingRate ?? 20,
                PlatinumJobPostingRate = rates.PlatinumJobPostingRate ?? 40,
                CandidateEmailRate = rates.CandidateEmailRate ?? 3
            }
        });
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<IEnumerable<CreditTransactionDto>>> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var transactions = await _context.RecruiterCreditTransactions
            .Where(t => t.RecruiterId == recruiter.Id)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new CreditTransactionDto
            {
                Id = t.Id,
                RecruiterId = t.RecruiterId,
                TransactionType = t.TransactionType.ToString(),
                Credits = t.Credits,
                BalanceBefore = t.BalanceBefore,
                BalanceAfter = t.BalanceAfter,
                ReferenceId = t.ReferenceId,
                Description = t.Description,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return Ok(transactions);
    }
}
