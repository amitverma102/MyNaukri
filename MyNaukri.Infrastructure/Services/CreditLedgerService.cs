using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using MyNaukri.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace MyNaukri.Infrastructure.Services;

public class CreditLedgerService : ICreditLedgerService
{
    private readonly ApplicationDbContext _context;
    private readonly decimal _maxDiscountPercentage;
    private readonly INotificationService _notificationService;
    private readonly ILogger<CreditLedgerService> _logger;

    public CreditLedgerService(
        ApplicationDbContext context, 
        IConfiguration configuration,
        INotificationService notificationService,
        ILogger<CreditLedgerService> logger)
    {
        _context = context;
        var maxDiscStr = configuration["CreditSettings:MaxDiscountPercentage"];
        _maxDiscountPercentage = string.IsNullOrEmpty(maxDiscStr) ? 50m : decimal.Parse(maxDiscStr);
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<bool> ConsumeInstitutionCreditsAsync(Guid institutionId, int amount, TransactionType transactionType, Guid performedByUserId, string? referenceId = null, string? description = null)
    {
        return await ConsumeCreditsInternalAsync(institutionId, null, amount, transactionType, performedByUserId, referenceId, description);
    }

    public async Task<bool> ConsumeRecruiterCreditsAsync(Guid recruiterId, Guid institutionId, int amount, TransactionType transactionType, Guid performedByUserId, string? referenceId = null, string? description = null)
    {
        return await ConsumeCreditsInternalAsync(institutionId, recruiterId, amount, transactionType, performedByUserId, referenceId, description);
    }

    private async Task<bool> ConsumeCreditsInternalAsync(Guid institutionId, Guid? recruiterId, int amount, TransactionType transactionType, Guid performedByUserId, string? referenceId, string? description)
    {
        if (amount <= 0) return true; // Nothing to consume

        var query = _context.CreditBatches
            .Where(b => b.InstitutionId == institutionId && b.Status == CreditBatchStatus.Active)
            .Where(b => b.ExpiryDate >= DateTime.UtcNow);

        if (recruiterId.HasValue)
        {
            query = query.Where(b => b.RecruiterId == recruiterId.Value);
        }
        else
        {
            query = query.Where(b => b.RecruiterId == null);
        }

        var batches = await query.OrderBy(b => b.ExpiryDate).ToListAsync();

        var totalAvailable = batches.Sum(b => b.RemainingQuantity);
        if (totalAvailable < amount)
        {
            return false; // Insufficient credits
        }

        // Get current balance
        int currentBalance = 0;
        if (recruiterId.HasValue)
        {
            var recruiter = await _context.Recruiters.FindAsync(recruiterId.Value);
            if (recruiter != null) currentBalance = recruiter.Credits;
        }
        else
        {
            var wallet = _context.InstitutionCreditWallets.Local.FirstOrDefault(w => w.InstitutionId == institutionId) 
                         ?? await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
            if (wallet != null) currentBalance = wallet.AvailableCredits;
        }

        int newBalance = currentBalance - amount;

        var transaction = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = recruiterId,
            TransactionType = transactionType,
            Credits = -amount,
            BalanceBefore = currentBalance,
            BalanceAfter = newBalance,
            ReferenceId = referenceId,
            Description = description,
            CreatedByUserId = performedByUserId
        };

        _context.CreditTransactions.Add(transaction);

        int remainingToConsume = amount;
        foreach (var batch in batches)
        {
            if (remainingToConsume <= 0) break;

            int toConsume = Math.Min(remainingToConsume, batch.RemainingQuantity);
            batch.RemainingQuantity -= toConsume;
            remainingToConsume -= toConsume;

            if (batch.RemainingQuantity == 0)
            {
                batch.Status = CreditBatchStatus.Depleted;
            }

            var mapping = new CreditTransactionBatch
            {
                CreditTransaction = transaction,
                CreditBatch = batch,
                Quantity = toConsume
            };
            _context.CreditTransactionBatches.Add(mapping);
        }

        if (!recruiterId.HasValue)
        {
            await CheckAndSendLowCreditAlertAsync(institutionId, currentBalance, newBalance);
        }

        return true;
    }

    public async Task<CreditBatch?> IssueCreditsAsync(Guid institutionId, Guid? recruiterId, CreditType creditType, int amount, DateTime expiryDate, Guid performedByUserId, TransactionType transactionType, string? description = null, decimal? price = null, decimal? discountPct = null, decimal? discountAmt = null, decimal? finalPrice = null)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive", nameof(amount));

        int currentBalance = 0;
        if (recruiterId.HasValue)
        {
            var recruiter = await _context.Recruiters.FindAsync(recruiterId.Value);
            if (recruiter != null) 
            {
                currentBalance = recruiter.Credits;
                recruiter.Credits += amount;
            }
        }
        else
        {
            var wallet = _context.InstitutionCreditWallets.Local.FirstOrDefault(w => w.InstitutionId == institutionId) 
                         ?? await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
            if (wallet != null) 
            {
                currentBalance = wallet.AvailableCredits;
                wallet.AvailableCredits += amount;
            }
        }

        var transaction = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = recruiterId,
            TransactionType = transactionType,
            Credits = amount,
            BalanceBefore = currentBalance,
            BalanceAfter = currentBalance + amount,
            Description = description,
            CreatedByUserId = performedByUserId,
            PriceBeforeDiscount = price,
            DiscountPercentage = discountPct,
            DiscountAmount = discountAmt,
            FinalPrice = finalPrice,
            ExpiryDate = expiryDate
        };

        _context.CreditTransactions.Add(transaction);

        var batch = new CreditBatch
        {
            InstitutionId = institutionId,
            RecruiterId = recruiterId,
            CreditType = creditType,
            OriginalQuantity = amount,
            RemainingQuantity = amount,
            ExpiryDate = expiryDate,
            SourceTransaction = transaction
        };

        _context.CreditBatches.Add(batch);

        return batch;
    }

    public async Task<(decimal UnusedPercentage, decimal DiscountPercentage, int DaysToExpiry, bool IsEligible)> GetRenewalEligibilityAsync(Guid institutionId)
    {
        var wallet = await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
        if (wallet == null || !wallet.CurrentExpiryDate.HasValue)
        {
            return (0, 0, 0, false);
        }

        var daysToExpiry = (int)(wallet.CurrentExpiryDate.Value - DateTime.UtcNow).TotalDays;
        
        // Ensure discount is only available when at least 45 days remain until expiry
        if (daysToExpiry < 45)
        {
            return (0, 0, daysToExpiry, false);
        }

        var sumOriginal = wallet.TotalPurchasedCredits;
        
        var totalUnusedByRecruiters = await _context.Recruiters
            .Where(r => r.InstitutionId == institutionId)
            .SumAsync(r => r.Credits);
            
        var sumRemaining = wallet.AvailableCredits + totalUnusedByRecruiters;
        
        if (sumOriginal == 0) return (0, 0, daysToExpiry, false);

        var unusedPercentage = Math.Round((decimal)sumRemaining / sumOriginal * 100m, 2);
        
        // Discount is Unused Percentage / 2, capped at MaxDiscountPercentage
        var calculatedDiscount = unusedPercentage / 2m;
        var finalDiscount = Math.Min(calculatedDiscount, _maxDiscountPercentage);

        return (unusedPercentage, finalDiscount, daysToExpiry, true);
    }

    public async Task<bool> TransferToRecruiterAsync(Guid institutionId, Guid recruiterId, int amount, Guid performedByUserId, string? description = null)
    {
        return await PerformTransferAsync(institutionId, null, recruiterId, amount, performedByUserId, description, TransactionType.InstitutionToRecruiterAllocation);
    }

    public async Task<bool> TransferBetweenRecruitersAsync(Guid institutionId, Guid fromRecruiterId, Guid toRecruiterId, int amount, Guid performedByUserId, string? description = null)
    {
        return await PerformTransferAsync(institutionId, fromRecruiterId, toRecruiterId, amount, performedByUserId, description, TransactionType.RecruiterToRecruiterTransfer);
    }

    public async Task<bool> RevokeFromRecruiterAsync(Guid institutionId, Guid recruiterId, int amount, Guid performedByUserId, string? description = null)
    {
        return await PerformTransferAsync(institutionId, recruiterId, null, amount, performedByUserId, description, TransactionType.CreditRefund);
    }

    private async Task<bool> PerformTransferAsync(Guid institutionId, Guid? sourceRecruiterId, Guid? targetRecruiterId, int amount, Guid performedByUserId, string? description, TransactionType transactionType)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive", nameof(amount));

        // Get batches to consume from source
        var query = _context.CreditBatches
            .Where(b => b.InstitutionId == institutionId && b.Status == CreditBatchStatus.Active && b.ExpiryDate >= DateTime.UtcNow);

        if (sourceRecruiterId.HasValue) query = query.Where(b => b.RecruiterId == sourceRecruiterId.Value);
        else query = query.Where(b => b.RecruiterId == null);

        var batches = await query.OrderBy(b => b.ExpiryDate).ToListAsync();

        var totalAvailable = batches.Sum(b => b.RemainingQuantity);
        if (totalAvailable < amount) return false;

        // Deduct from Source
        int sourceBalance = 0;
        int newSourceBalance = 0;
        if (sourceRecruiterId.HasValue)
        {
            var r = await _context.Recruiters.FindAsync(sourceRecruiterId.Value);
            if (r != null) { sourceBalance = r.Credits; r.Credits -= amount; newSourceBalance = r.Credits; }
        }
        else
        {
            var w = _context.InstitutionCreditWallets.Local.FirstOrDefault(w => w.InstitutionId == institutionId) 
                    ?? await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
            if (w != null) { sourceBalance = w.AvailableCredits; w.AvailableCredits -= amount; w.TotalAllocatedCredits += amount; newSourceBalance = w.AvailableCredits; }
        }

        var sourceTransaction = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = sourceRecruiterId,
            TransactionType = transactionType,
            Credits = -amount,
            BalanceBefore = sourceBalance,
            BalanceAfter = newSourceBalance,
            CreatedByUserId = performedByUserId,
            Description = description ?? "Transfer Out"
        };
        _context.CreditTransactions.Add(sourceTransaction);

        // Add to Target
        int targetBalance = 0;
        if (targetRecruiterId.HasValue)
        {
            var r = await _context.Recruiters.FindAsync(targetRecruiterId.Value);
            if (r != null) { targetBalance = r.Credits; r.Credits += amount; }
        }
        else
        {
            var w = _context.InstitutionCreditWallets.Local.FirstOrDefault(w => w.InstitutionId == institutionId) 
                    ?? await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
            if (w != null) { targetBalance = w.AvailableCredits; w.AvailableCredits += amount; }
        }

        var targetTransaction = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = targetRecruiterId,
            TransactionType = transactionType,
            Credits = amount,
            BalanceBefore = targetBalance,
            BalanceAfter = targetBalance + amount,
            CreatedByUserId = performedByUserId,
            Description = description ?? "Transfer In"
        };
        _context.CreditTransactions.Add(targetTransaction);

        // Map Batches
        int remainingToConsume = amount;
        foreach (var batch in batches)
        {
            if (remainingToConsume <= 0) break;

            int toConsume = Math.Min(remainingToConsume, batch.RemainingQuantity);
            batch.RemainingQuantity -= toConsume;
            remainingToConsume -= toConsume;

            if (batch.RemainingQuantity == 0) batch.Status = CreditBatchStatus.Depleted;

            _context.CreditTransactionBatches.Add(new CreditTransactionBatch
            {
                CreditTransaction = sourceTransaction,
                CreditBatch = batch,
                Quantity = toConsume
            });

            // Issue new batch to target matching the consumed batch's expiry
            var targetBatch = new CreditBatch
            {
                InstitutionId = institutionId,
                RecruiterId = targetRecruiterId,
                CreditType = CreditType.Transfer,
                OriginalQuantity = toConsume,
                RemainingQuantity = toConsume,
                ExpiryDate = batch.ExpiryDate,
                SourceTransaction = targetTransaction
            };
            _context.CreditBatches.Add(targetBatch);
        }

        if (!sourceRecruiterId.HasValue)
        {
            await CheckAndSendLowCreditAlertAsync(institutionId, sourceBalance, newSourceBalance);
        }

        return true;
    }

    private async Task CheckAndSendLowCreditAlertAsync(Guid institutionId, int balanceBefore, int balanceAfter)
    {
        try
        {
            // Find last recharge
            var lastRecharge = await _context.CreditTransactions
                .Where(t => t.InstitutionId == institutionId && !t.RecruiterId.HasValue)
                .Where(t => t.TransactionType == TransactionType.InstitutionCreditPurchase || 
                            t.TransactionType == TransactionType.TopUp || 
                            t.TransactionType == TransactionType.AnnualRecharge ||
                            t.TransactionType == TransactionType.SuperAdminCreditAllocation)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            int lastRechargeAmount = lastRecharge?.Credits ?? 0;
            int threshold = Math.Max(100, (int)(lastRechargeAmount * 0.10));

            // Only trigger alert if balance JUST fell below threshold
            if (balanceBefore >= threshold && balanceAfter < threshold)
            {
                var adminProfile = await _context.InstituteAdminProfiles
                    .Include(p => p.User)
                    .Include(p => p.Institution)
                    .FirstOrDefaultAsync(p => p.InstitutionId == institutionId);

                if (adminProfile != null)
                {
                    var subject = "Low Credit Alert - Edukey360";
                    var body = $"<p>Dear {adminProfile.User.FirstName},</p>" +
                               $"<p>This is an automated alert to notify you that your institution's (<b>{adminProfile.Institution.Name}</b>) credit balance has fallen below the critical threshold.</p>" +
                               $"<p><b>Current Balance:</b> {balanceAfter} credits</p>" +
                               $"<p>Please recharge your account or contact support to continue enjoying uninterrupted services.</p>" +
                               $"<p>Best regards,<br>Team Edukey360</p>";

                    await _notificationService.SendEmailAsync(
                        adminProfile.User.Email,
                        subject,
                        body,
                        emailType: MyNaukri.Domain.Enums.EmailType.JobAlert
                    );

                    _logger.LogInformation("Low credit alert sent to {Email} for Institution {InstitutionId}. New Balance: {Balance}, Threshold: {Threshold}", 
                        adminProfile.User.Email, institutionId, balanceAfter, threshold);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check and send low credit alert for institution {InstitutionId}", institutionId);
        }
    }
}
