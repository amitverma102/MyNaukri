using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class JobApplication : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;
    
    public Guid JobId { get; set; }
    public Job Job { get; set; } = null!;
    
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;
    
    public decimal? AiMatchScore { get; set; }
    public string AiFeedback { get; set; } = string.Empty;
    
    public DateTime? InterviewDate { get; set; }
    public InterviewMode? InterviewMode { get; set; }
    public string? InterviewLink { get; set; }
    public string? InterviewVenue { get; set; }
    public string? InterviewDetails { get; set; }
    public string? ScreeningAnswersJson { get; set; }
    public string? CoverLetter { get; set; }
    public string? ResumeUrl { get; set; }
    
    public ICollection<JobApplicationComment> Comments { get; set; } = new List<JobApplicationComment>();
}
