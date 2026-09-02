using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class InstitutionCreditService : IInstitutionCreditService
{
    private readonly ApplicationDbContext _context;
    private readonly ICreditLedgerService _creditLedgerService;

    public InstitutionCreditService(ApplicationDbContext context, ICreditLedgerService creditLedgerService)
    {
        _context = context;
        _creditLedgerService = creditLedgerService;
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
                PurchasedBy = await _context.Users.FindAsync(purchasedByUserId),
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

            wallet.TotalPurchasedCredits += credits;

            await _creditLedgerService.IssueCreditsAsync(
                institutionId: institutionId,
                recruiterId: null,
                creditType: CreditType.TopUp,
                amount: credits,
                expiryDate: DateTime.UtcNow.AddMonths(12), // default 12 months for purchase unless specified
                performedByUserId: purchasedByUserId,
                transactionType: TransactionType.InstitutionCreditPurchase,
                description: "Credit Purchase",
                price: pricePerCredit,
                finalPrice: totalAmount
            );

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
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var success = await _creditLedgerService.TransferToRecruiterAsync(institutionId, recruiterId, credits, allocatedByUserId, reason);
            if (success)
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            return success;
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

    public async Task<bool> RevokeFromRecruiterAsync(Guid institutionId, Guid recruiterId, int credits, Guid revokedByUserId, string? reason)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var success = await _creditLedgerService.RevokeFromRecruiterAsync(institutionId, recruiterId, credits, revokedByUserId, reason);
            if (success)
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            return success;
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
        if (fromRecruiterId == toRecruiterId) return false;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var success = await _creditLedgerService.TransferBetweenRecruitersAsync(institutionId, fromRecruiterId, toRecruiterId, credits, transferredByUserId, reason);
            if (success)
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            return success;
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

            await _creditLedgerService.IssueCreditsAsync(
                institutionId: institutionId,
                recruiterId: null,
                creditType: CreditType.TopUp,
                amount: credits,
                expiryDate: DateTime.UtcNow.AddMonths(12),
                performedByUserId: addedByUserId,
                transactionType: TransactionType.InstitutionAdminCredit,
                description: reason
            );

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

    public async Task<CreditTransaction?> SuperAdminAddCreditsAsync(Guid institutionId, int credits, Guid addedByUserId, string reason)
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

            var batch = await _creditLedgerService.IssueCreditsAsync(
                institutionId: institutionId,
                recruiterId: null,
                creditType: CreditType.TopUp,
                amount: credits,
                expiryDate: DateTime.UtcNow.AddMonths(12),
                performedByUserId: addedByUserId,
                transactionType: TransactionType.SuperAdminCreditAllocation,
                description: reason
            );

            var auditLog = new AuditLog
            {
                Action = "ADD_INSTITUTION_CREDITS",
                PerformedByUserId = addedByUserId,
                Role = Role.SuperAdministrator,
                InstitutionId = institutionId,
                Details = System.Text.Json.JsonSerializer.Serialize(new 
                {
                    credits,
                    balanceBefore,
                    balanceAfter = balanceBefore + credits, // approximately
                    reason
                })
            };

            _context.AuditLogs.Add(auditLog);
            
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            return batch?.SourceTransaction;
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return null;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
