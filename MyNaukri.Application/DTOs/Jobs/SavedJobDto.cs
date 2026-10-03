using System;

namespace MyNaukri.Application.DTOs.Jobs;

public class SavedJobDto
{
    public Guid Id { get; set; }
    public Guid CandidateId { get; set; }
    public Guid JobId { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Summary of the Job for quick viewing
    public string JobTitle { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public string JobRequirements { get; set; } = string.Empty;
    public string JobLocation { get; set; } = string.Empty;
    public string JobType { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public bool IsActive { get; set; }
    public string? InstitutionLogoUrl { get; set; }
    public bool IsPlatinum { get; set; }
    public bool IsApplied { get; set; }
    public string? WorkMode { get; set; }
    public string? BoardAffiliation { get; set; }
    public string? SubjectDepartment { get; set; }
    public string? ScreeningQuestionsJson { get; set; }
    public string? Keywords { get; set; }
    public DateTime? JobCreatedAt { get; set; }
}
