using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class Recruiter : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string Designation { get; set; } = string.Empty;
    
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;
    
    public ICollection<Job> PostedJobs { get; set; } = new List<Job>();
    
    public int Credits { get; set; } = 0;
    public RecruiterCreditRate? CreditRate { get; set; }
    public ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();
    public ICollection<CandidateContactAccess> ContactAccesses { get; set; } = new List<CandidateContactAccess>();
}
