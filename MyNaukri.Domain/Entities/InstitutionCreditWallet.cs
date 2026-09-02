using MyNaukri.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace MyNaukri.Domain.Entities;

public class InstitutionCreditWallet : BaseEntity
{
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;
    
    public int AvailableCredits { get; set; } = 0;
    public int TotalPurchasedCredits { get; set; } = 0;
    public int TotalAllocatedCredits { get; set; } = 0;
    public int TotalConsumedCredits { get; set; } = 0;
    
    public DateTime? CurrentExpiryDate { get; set; }
}
