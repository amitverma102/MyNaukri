using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.Interfaces;

public interface ICreditService
{
    Task<int> GetBalanceAsync(Guid recruiterId);
    Task<RecruiterCreditRate> GetRatesAsync(Guid recruiterId);
    Task<bool> HasSufficientCreditsAsync(Guid recruiterId, int requiredCredits);
    Task<bool> DeductCreditsAsync(Guid recruiterId, int credits, TransactionType transactionType, string? referenceId = null, string? description = null, Guid? currentUserId = null);
    Task<bool> AddCreditsAsync(Guid recruiterId, int credits, TransactionType transactionType, string? referenceId = null, string? description = null, Guid? currentUserId = null);
}
