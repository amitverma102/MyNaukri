using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Infrastructure.Services;

public interface ICreditLedgerService
{
    Task<bool> ConsumeInstitutionCreditsAsync(Guid institutionId, int amount, TransactionType transactionType, Guid performedByUserId, string? referenceId = null, string? description = null);
    Task<bool> ConsumeRecruiterCreditsAsync(Guid recruiterId, Guid institutionId, int amount, TransactionType transactionType, Guid performedByUserId, string? referenceId = null, string? description = null);
    Task<CreditBatch?> IssueCreditsAsync(Guid institutionId, Guid? recruiterId, CreditType creditType, int amount, DateTime expiryDate, Guid performedByUserId, TransactionType transactionType, string? description = null, decimal? price = null, decimal? discountPct = null, decimal? discountAmt = null, decimal? finalPrice = null);
    Task<bool> TransferToRecruiterAsync(Guid institutionId, Guid recruiterId, int amount, Guid performedByUserId, string? description = null);
    Task<bool> TransferBetweenRecruitersAsync(Guid institutionId, Guid fromRecruiterId, Guid toRecruiterId, int amount, Guid performedByUserId, string? description = null);
    Task<bool> RevokeFromRecruiterAsync(Guid institutionId, Guid recruiterId, int amount, Guid performedByUserId, string? description = null);
    
    // Quotes and logic
    Task<(decimal UnusedPercentage, decimal DiscountPercentage, int DaysToExpiry, bool IsEligible)> GetRenewalEligibilityAsync(Guid institutionId);
}
