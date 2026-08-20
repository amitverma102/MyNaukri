using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.Jobs;

public class JobApplicationDto
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public Guid CandidateId { get; set; }
    public ApplicationStatus Status { get; set; }
    public decimal? AiMatchScore { get; set; }
    public string AiFeedback { get; set; } = string.Empty;
    public DateTime? InterviewDate { get; set; }
    public string? InterviewLink { get; set; }
    public string CandidateName { get; set; } = string.Empty;
    public string CandidateEmail { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
}
