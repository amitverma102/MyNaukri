using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class CreditBatch : BaseEntity
{
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;

    public Guid? RecruiterId { get; set; }
    public Recruiter? Recruiter { get; set; }

    public CreditType CreditType { get; set; }
    public int OriginalQuantity { get; set; }
    public int RemainingQuantity { get; set; }
    
    public DateTime IssuedDate { get; set; } = DateTime.UtcNow;
    public DateTime ExpiryDate { get; set; }
    
    public CreditBatchStatus Status { get; set; } = CreditBatchStatus.Active;
    
    public Guid? SourceTransactionId { get; set; }
    public CreditTransaction? SourceTransaction { get; set; }
}
