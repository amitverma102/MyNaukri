using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class CreditService : ICreditService
{
    private readonly ApplicationDbContext _context;
    private readonly ICreditLedgerService _creditLedgerService;
    private readonly IConfiguration? _configuration;

    public CreditService(ApplicationDbContext context, ICreditLedgerService creditLedgerService, IConfiguration? configuration = null)
    {
        _context = context;
        _creditLedgerService = creditLedgerService;
        _configuration = configuration;
    }

    public async Task<int> GetBalanceAsync(Guid recruiterId)
    {
        var recruiter = await _context.Recruiters
            .FirstOrDefaultAsync(r => r.Id == recruiterId);
            
        if (recruiter == null) return 0;

        var hasBatches = await _context.CreditBatches
            .AnyAsync(b => b.RecruiterId == recruiterId);

        if (hasBatches)
        {
            var activeBatchCredits = await _context.CreditBatches
                .Where(b => b.RecruiterId == recruiterId && b.Status == CreditBatchStatus.Active && b.ExpiryDate >= DateTime.UtcNow)
                .SumAsync(b => b.RemainingQuantity);

            if (recruiter.Credits != activeBatchCredits)
            {
                recruiter.Credits = activeBatchCredits;
                await _context.SaveChangesAsync();
            }

            return activeBatchCredits;
        }

        return recruiter.Credits;
    }

    private int GetConfigInt(string key, int defaultValue)
    {
        var valStr = _configuration?[key];
        return int.TryParse(valStr, out var parsed) ? parsed : defaultValue;
    }

    public async Task<RecruiterCreditRate> GetRatesAsync(Guid recruiterId)
    {
        int defaultResumeDownloadRate = GetConfigInt("CreditSettings:ResumeDownloadRate", 5);
        int defaultContactViewRate = GetConfigInt("CreditSettings:ContactViewRate", 2);
        int defaultBulkProfileDownloadRate = GetConfigInt("CreditSettings:BulkProfileDownloadRate", 2);
        int defaultNormalJobPostingRate = GetConfigInt("CreditSettings:NormalJobPostingRate", 20);
        int defaultPlatinumJobPostingRate = GetConfigInt("CreditSettings:PlatinumJobPostingRate", 40);
        int defaultCandidateEmailRate = GetConfigInt("CreditSettings:CandidateEmailRate", 3);

        var rate = await _context.RecruiterCreditRates
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.RecruiterId == recruiterId);
            
        if (rate != null)
        {
            rate.ResumeDownloadRate ??= defaultResumeDownloadRate;
            rate.ContactViewRate ??= defaultContactViewRate;
            rate.BulkProfileDownloadRate ??= defaultBulkProfileDownloadRate;
            rate.NormalJobPostingRate ??= defaultNormalJobPostingRate;
            rate.CandidateEmailRate ??= defaultCandidateEmailRate;

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
            ResumeDownloadRate = defaultResumeDownloadRate,
            ContactViewRate = defaultContactViewRate,
            BulkProfileDownloadRate = defaultBulkProfileDownloadRate,
            NormalJobPostingRate = defaultNormalJobPostingRate,
            PlatinumJobPostingRate = defaultPlatinumJobPostingRate,
            CandidateEmailRate = defaultCandidateEmailRate
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
