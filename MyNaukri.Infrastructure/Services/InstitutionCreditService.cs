using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class InstitutionCreditService : IInstitutionCreditService
{
    private readonly ApplicationDbContext _context;

    public InstitutionCreditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InstitutionCreditWallet?> GetWalletAsync(Guid institutionId)
    {
        return await _context.InstitutionCreditWallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
    }

    public async Task<decimal> GetCurrentPricePerCreditAsync()
    {
        var activeConfig = await _context.CreditPriceConfigurations
            .AsNoTracking()
            .Where(c => c.IsActive && c.EffectiveFrom <= DateTime.UtcNow && (c.EffectiveTo == null || c.EffectiveTo >= DateTime.UtcNow))
            .OrderByDescending(c => c.EffectiveFrom)
            .FirstOrDefaultAsync();

        return activeConfig?.PricePerCredit ?? 1.0m; // Default to 1.0 if not configured
    }

    public async Task<CreditPurchase> PurchaseCreditsAsync(Guid institutionId, int credits, Guid purchasedByUserId)
    {
        if (credits <= 0) throw new ArgumentException("Credits must be greater than zero.", nameof(credits));

        var pricePerCredit = await GetCurrentPricePerCreditAsync();
        var totalAmount = credits * pricePerCredit;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var purchase = new CreditPurchase
            {
                InstitutionId = institutionId,
                CreditsPurchased = credits,
                PricePerCredit = pricePerCredit,
                TotalAmount = totalAmount,
                Currency = "INR",
                PurchasedByUserId = purchasedByUserId,
                PaymentStatus = PaymentStatus.Successful, // Auto-success for now, simulating real payment later
                Notes = "Direct Purchase"
            };
            
            _context.CreditPurchases.Add(purchase);
            
            var wallet = await _context.InstitutionCreditWallets
                .FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
                
            if (wallet == null)
            {
                wallet = new InstitutionCreditWallet { InstitutionId = institutionId };
                _context.InstitutionCreditWallets.Add(wallet);
            }

            var balanceBefore = wallet.AvailableCredits;
            
            wallet.AvailableCredits += credits;
            wallet.TotalPurchasedCredits += credits;
            
            var creditTransaction = new CreditTransaction
            {
                InstitutionId = institutionId,
                TransactionType = TransactionType.InstitutionCreditPurchase,
                Credits = credits,
                BalanceBefore = balanceBefore,
                BalanceAfter = wallet.AvailableCredits,
                ReferenceType = "Purchase",
                CreatedByUserId = purchasedByUserId,
                Description = "Credit Purchase"
            };
            
            _context.CreditTransactions.Add(creditTransaction);
            
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            purchase.PaymentReference = $"TXN-{purchase.Id.ToString().Substring(0, 8).ToUpper()}";
            await _context.SaveChangesAsync();
            
            return purchase;
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            throw new Exception("Concurrency conflict detected while purchasing credits.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> AllocateToRecruiterAsync(Guid institutionId, Guid recruiterId, int credits, Guid allocatedByUserId, string? reason)
    {
        if (credits <= 0) throw new ArgumentException("Credits must be positive.", nameof(credits));

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var wallet = await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
            if (wallet == null || wallet.AvailableCredits < credits) return false;

            var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.Id == recruiterId && r.InstitutionId == institutionId);
            if (recruiter == null) return false;

            // Institution Deduct
            var instBalanceBefore = wallet.AvailableCredits;
            wallet.AvailableCredits -= credits;
            wallet.TotalAllocatedCredits += credits;

            // Recruiter Add
            var recBalanceBefore = recruiter.Credits;
            recruiter.Credits += credits;

            // Transactions
            var instTransaction = new CreditTransaction
            {
                InstitutionId = institutionId,
                TransactionType = TransactionType.InstitutionToRecruiterAllocation,
                Credits = -credits,
                BalanceBefore = instBalanceBefore,
                BalanceAfter = wallet.AvailableCredits,
                RecruiterId = recruiterId,
                ReferenceType = "Allocation",
                CreatedByUserId = allocatedByUserId,
                Description = reason ?? "Allocated to recruiter"
            };
            
            var recTransaction = new CreditTransaction
            {
                InstitutionId = institutionId,
                RecruiterId = recruiterId,
                TransactionType = TransactionType.InstitutionToRecruiterAllocation,
                Credits = credits,
                BalanceBefore = recBalanceBefore,
                BalanceAfter = recruiter.Credits,
                ReferenceType = "Allocation",
                CreatedByUserId = allocatedByUserId,
                Description = reason ?? "Received from institution"
            };

            _context.CreditTransactions.Add(instTransaction);
            _context.CreditTransactions.Add(recTransaction);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return false;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> TransferBetweenRecruitersAsync(Guid institutionId, Guid fromRecruiterId, Guid toRecruiterId, int credits, Guid transferredByUserId, string? reason)
    {
        if (credits <= 0) throw new ArgumentException("Credits must be positive.", nameof(credits));
        if (fromRecruiterId == toRecruiterId) return false;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var fromRecruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.Id == fromRecruiterId && r.InstitutionId == institutionId);
            var toRecruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.Id == toRecruiterId && r.InstitutionId == institutionId);
            
            if (fromRecruiter == null || toRecruiter == null) return false;
            if (fromRecruiter.Credits < credits) return false;

            var fromBalanceBefore = fromRecruiter.Credits;
            var toBalanceBefore = toRecruiter.Credits;

            fromRecruiter.Credits -= credits;
            toRecruiter.Credits += credits;

            var debitTx = new CreditTransaction
            {
                InstitutionId = institutionId,
                RecruiterId = fromRecruiterId,
                TransactionType = TransactionType.RecruiterToRecruiterTransfer,
                Credits = -credits,
                BalanceBefore = fromBalanceBefore,
                BalanceAfter = fromRecruiter.Credits,
                ReferenceType = "Transfer Out",
                ReferenceId = toRecruiterId.ToString(),
                CreatedByUserId = transferredByUserId,
                Description = reason ?? $"Transferred to {toRecruiter.UserId}"
            };

            var creditTx = new CreditTransaction
            {
                InstitutionId = institutionId,
                RecruiterId = toRecruiterId,
                TransactionType = TransactionType.RecruiterToRecruiterTransfer,
                Credits = credits,
                BalanceBefore = toBalanceBefore,
                BalanceAfter = toRecruiter.Credits,
                ReferenceType = "Transfer In",
                ReferenceId = fromRecruiterId.ToString(),
                CreatedByUserId = transferredByUserId,
                Description = reason ?? $"Received from {fromRecruiter.UserId}"
            };

            _context.CreditTransactions.Add(debitTx);
            _context.CreditTransactions.Add(creditTx);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return false;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> AdminAddCreditsAsync(Guid institutionId, int credits, Guid addedByUserId, string reason)
    {
        if (credits <= 0) throw new ArgumentException("Credits must be positive.", nameof(credits));

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var wallet = await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId);
            if (wallet == null)
            {
                wallet = new InstitutionCreditWallet { InstitutionId = institutionId };
                _context.InstitutionCreditWallets.Add(wallet);
            }

            var balanceBefore = wallet.AvailableCredits;
            
            wallet.AvailableCredits += credits;
            
            // Should we add to TotalPurchasedCredits? No, it's an admin issue. Maybe keep it separate or we just let Available increase.
            
            var creditTransaction = new CreditTransaction
            {
                InstitutionId = institutionId,
                TransactionType = TransactionType.InstitutionAdminCredit,
                Credits = credits,
                BalanceBefore = balanceBefore,
                BalanceAfter = wallet.AvailableCredits,
                ReferenceType = "AdminIssue",
                CreatedByUserId = addedByUserId,
                Description = reason
            };
            
            _context.CreditTransactions.Add(creditTransaction);
            
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return false;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
