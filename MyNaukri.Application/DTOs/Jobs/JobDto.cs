using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.Jobs;

public class JobDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Requirements { get; set; } = string.Empty;
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public JobType JobType { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public Guid RecruiterId { get; set; }
    public Guid InstitutionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public bool IsPlatinum { get; set; }
    public bool IsApplied { get; set; }
    
    // Additional Facets & Screening
    public string? ScreeningQuestionsJson { get; set; }
    public string? WorkMode { get; set; }
    public string? BoardAffiliation { get; set; }
    public string? SubjectDepartment { get; set; }
    public string? InstitutionLogoUrl { get; set; }

    // Approval flow fields
    public string ApprovalStatus { get; set; } = "Approved";
    public string? ApprovalComment { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RecruiterName { get; set; }
    public string? RecruiterEmail { get; set; }
    public string? RecruiterDesignation { get; set; }

    // Restriction & Assignment fields
    public bool IsRestrictedAccess { get; set; }
    public List<Guid> AssignedRecruiterIds { get; set; } = new();
    public List<string> AssignedRecruiterNames { get; set; } = new();
    public bool IsOwner { get; set; }
    public bool CanManage { get; set; } = true;
}
