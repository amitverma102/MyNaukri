using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class CreditPriceConfiguration : BaseEntity
{
    public decimal PricePerCredit { get; set; }
    public string Currency { get; set; } = "INR";
    public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveTo { get; set; }
    
    public Guid CreatedByUserId { get; set; }
    public User CreatedBy { get; set; } = null!;
    
    public bool IsActive { get; set; } = true;
}
