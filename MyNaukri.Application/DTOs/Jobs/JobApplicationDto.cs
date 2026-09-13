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
    public InterviewMode? InterviewMode { get; set; }
    public string? InterviewLink { get; set; }
    public string? InterviewVenue { get; set; }
    public string? InterviewDetails { get; set; }
    public string CandidateName { get; set; } = string.Empty;
    public string CandidateEmail { get; set; } = string.Empty;
    public string? CandidatePhoneNumber { get; set; }
    public string? CandidateResumeUrl { get; set; }
    public string? CandidateProfilePictureUrl { get; set; }
    public string? CoverLetter { get; set; }
    public string? ScreeningAnswersJson { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string? InstitutionLogoUrl { get; set; }
}
