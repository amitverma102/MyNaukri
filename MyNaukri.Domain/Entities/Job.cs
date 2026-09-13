using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class Job : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Requirements { get; set; } = string.Empty;
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public JobType JobType { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    
    public Guid RecruiterId { get; set; }
    public Recruiter Recruiter { get; set; } = null!;

    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;
    
    public bool IsPlatinum { get; set; }
    
    // Search facets & Screening
    public string? ScreeningQuestionsJson { get; set; }
    public string? WorkMode { get; set; }
    public string? BoardAffiliation { get; set; }
    public string? SubjectDepartment { get; set; }
    
    public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
}
