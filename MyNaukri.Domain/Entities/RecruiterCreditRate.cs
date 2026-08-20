using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class RecruiterCreditRate : BaseEntity
{
    public Guid RecruiterId { get; set; }
    public Recruiter Recruiter { get; set; } = null!;
    
    public int? ResumeDownloadRate { get; set; }
    public int? ContactViewRate { get; set; }
    public int? BulkProfileDownloadRate { get; set; }
    public int? NormalJobPostingRate { get; set; }
    public int? PlatinumJobPostingRate { get; set; }
    public int? CandidateEmailRate { get; set; }
}
