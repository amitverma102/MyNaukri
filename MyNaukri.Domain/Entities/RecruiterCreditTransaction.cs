using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class RecruiterCreditTransaction : BaseEntity
{
    public Guid RecruiterId { get; set; }
    public Recruiter Recruiter { get; set; } = null!;
    
    public TransactionType TransactionType { get; set; }
    public int Credits { get; set; }
    public int BalanceBefore { get; set; }
    public int BalanceAfter { get; set; }
    public string? ReferenceId { get; set; }
    public string? Description { get; set; }
    
    // Optional reference to a User who did the manual adjustment
    public Guid? CreatedByUserId { get; set; }
}
