using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class CreditTransaction : BaseEntity
{
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;
    
    public Guid? RecruiterId { get; set; }
    public Recruiter? Recruiter { get; set; }
    
    public TransactionType TransactionType { get; set; }
    public int Credits { get; set; }
    
    public int BalanceBefore { get; set; }
    public int BalanceAfter { get; set; }
    
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
    public string? Description { get; set; }
    public string? Reason { get; set; }
    
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public decimal? PriceBeforeDiscount { get; set; }
    public decimal? DiscountPercentage { get; set; }
    public decimal? DiscountAmount { get; set; }
    public decimal? FinalPrice { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
