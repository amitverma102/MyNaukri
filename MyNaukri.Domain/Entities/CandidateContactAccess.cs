using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class CandidateContactAccess : BaseEntity
{
    public Guid RecruiterId { get; set; }
    public Recruiter Recruiter { get; set; } = null!;
    
    public Guid CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;
    
    public int CreditsCharged { get; set; }
    
    public bool HasUnlockedContact { get; set; } = true;
    public bool HasDownloadedResume { get; set; } = false;
}
