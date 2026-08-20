using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Credits;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/admin/recruiters")]
[Authorize(Roles = "SuperAdministrator")]
public class AdminCreditController : ControllerBase
{
    private readonly ICreditService _creditService;
    private readonly ApplicationDbContext _context;

    public AdminCreditController(ICreditService creditService, ApplicationDbContext context)
    {
        _creditService = creditService;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetRecruiters()
    {
        var recruiters = await _context.Recruiters
            .Include(r => r.User)
            .Include(r => r.Institution)
            .Select(r => new
            {
                r.Id,
                CompanyName = r.Institution != null ? r.Institution.Name : "",
                ContactName = r.User.FirstName + " " + r.User.LastName,
                r.Credits,
                Email = r.User.Email,
                FirstName = r.User.FirstName,
                LastName = r.User.LastName
            })
            .ToListAsync();
            
        return Ok(recruiters);
    }

    [HttpPost("{id}/credits")]
    public async Task<ActionResult> IssueCredits(Guid id, [FromBody] int credits)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FindAsync(id);
        if (recruiter == null) return NotFound("Recruiter not found.");

        if (credits > 0)
        {
            await _creditService.AddCreditsAsync(id, credits, TransactionType.CreditIssued, null, "Admin issued credits", currentUserId);
        }
        else if (credits < 0)
        {
            // For negative credits, we deduct
            var success = await _creditService.DeductCreditsAsync(id, Math.Abs(credits), TransactionType.CreditAdjustment, null, "Admin deducted credits", currentUserId);
            if (!success) return BadRequest("Insufficient balance for this deduction.");
        }

        var balance = await _creditService.GetBalanceAsync(id);
        return Ok(new { AvailableCredits = balance });
    }

    [HttpPut("{id}/credit-rates")]
    public async Task<ActionResult> UpdateRates(Guid id, [FromBody] CreditRateDto ratesDto)
    {
        var rate = await _context.RecruiterCreditRates.FirstOrDefaultAsync(r => r.RecruiterId == id);
        if (rate == null)
        {
            rate = new RecruiterCreditRate { RecruiterId = id };
            _context.RecruiterCreditRates.Add(rate);
        }

        rate.ResumeDownloadRate = ratesDto.ResumeDownloadRate;
        rate.ContactViewRate = ratesDto.ContactViewRate;
        rate.BulkProfileDownloadRate = ratesDto.BulkProfileDownloadRate;
        rate.NormalJobPostingRate = ratesDto.NormalJobPostingRate;
        rate.PlatinumJobPostingRate = ratesDto.PlatinumJobPostingRate;
        rate.CandidateEmailRate = ratesDto.CandidateEmailRate;

        await _context.SaveChangesAsync();
        return Ok(rate);
    }
}
