using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class CreditService : ICreditService
{
    private readonly ApplicationDbContext _context;
    private readonly ICreditLedgerService _creditLedgerService;

    public CreditService(ApplicationDbContext context, ICreditLedgerService creditLedgerService)
    {
        _context = context;
        _creditLedgerService = creditLedgerService;
    }

    public async Task<int> GetBalanceAsync(Guid recruiterId)
    {
        var recruiter = await _context.Recruiters
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recruiterId);
            
        return recruiter?.Credits ?? 0;
    }

    public async Task<RecruiterCreditRate> GetRatesAsync(Guid recruiterId)
    {
        var rate = await _context.RecruiterCreditRates
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.RecruiterId == recruiterId);
            
        if (rate != null)
        {
            // If Platinum is not configured, calculate as 2x Normal
            if (!rate.PlatinumJobPostingRate.HasValue && rate.NormalJobPostingRate.HasValue)
            {
                rate.PlatinumJobPostingRate = rate.NormalJobPostingRate.Value * 2;
            }
            return rate;
        }

        // Return System Defaults if none found
        return new RecruiterCreditRate
        {
            RecruiterId = recruiterId,
            ResumeDownloadRate = 5,
            ContactViewRate = 2,
            BulkProfileDownloadRate = 2,
            NormalJobPostingRate = 20,
            PlatinumJobPostingRate = 40,
            CandidateEmailRate = 3
        };
    }

    public async Task<bool> HasSufficientCreditsAsync(Guid recruiterId, int requiredCredits)
    {
        var balance = await GetBalanceAsync(recruiterId);
        return balance >= requiredCredits;
    }

    public async Task<bool> DeductCreditsAsync(Guid recruiterId, int credits, TransactionType transactionType, string? referenceId = null, string? description = null, Guid? currentUserId = null)
    {
        if (credits < 0) throw new ArgumentException("Credits to deduct must be positive.", nameof(credits));
        if (credits == 0) return true;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.Id == recruiterId);
            if (recruiter == null) return false;

            var success = await _creditLedgerService.ConsumeRecruiterCreditsAsync(recruiterId, recruiter.InstitutionId, credits, transactionType, currentUserId ?? Guid.Empty, referenceId, description);
            
            if (success)
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            return success;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> AddCreditsAsync(Guid recruiterId, int credits, TransactionType transactionType, string? referenceId = null, string? description = null, Guid? currentUserId = null)
    {
        if (credits <= 0) throw new ArgumentException("Credits to add must be positive.", nameof(credits));

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.Id == recruiterId);
            if (recruiter == null) return false;

            // Give it a default expiry of 12 months for manual recruiter additions (e.g. refunds)
            await _creditLedgerService.IssueCreditsAsync(recruiter.InstitutionId, recruiterId, CreditType.TopUp, credits, DateTime.UtcNow.AddMonths(12), currentUserId ?? Guid.Empty, transactionType, description);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
