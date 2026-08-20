using MyNaukri.Domain.Entities;

namespace MyNaukri.Application.Interfaces;

public interface IInstitutionCreditService
{
    Task<InstitutionCreditWallet?> GetWalletAsync(Guid institutionId);
    Task<decimal> GetCurrentPricePerCreditAsync();
    
    // Core actions
    Task<CreditPurchase> PurchaseCreditsAsync(Guid institutionId, int credits, Guid purchasedByUserId);
    Task<bool> AllocateToRecruiterAsync(Guid institutionId, Guid recruiterId, int credits, Guid allocatedByUserId, string? reason);
    Task<bool> TransferBetweenRecruitersAsync(Guid institutionId, Guid fromRecruiterId, Guid toRecruiterId, int credits, Guid transferredByUserId, string? reason);
    
    // SuperAdmin actions
    Task<bool> AdminAddCreditsAsync(Guid institutionId, int credits, Guid addedByUserId, string reason);
}
