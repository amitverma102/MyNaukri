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
}
