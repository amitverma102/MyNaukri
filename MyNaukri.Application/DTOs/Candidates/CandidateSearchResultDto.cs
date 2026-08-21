using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.Candidates;

public class CandidateSearchResultDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public int TotalExperienceYears { get; set; }
    public string CurrentLocation { get; set; } = string.Empty;
    public string Education { get; set; } = string.Empty;
    
    // New fields
    public Gender? Gender { get; set; }
    public bool DifferentlyAbled { get; set; }
    public bool ExServiceman { get; set; }
    public ExServicemanBranch? ExServicemanBranch { get; set; }
    
    // Access flags
    public bool HasUnlockedContact { get; set; }
    public bool HasDownloadedResume { get; set; }
    
    // These will be populated ONLY if the corresponding access is unlocked
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ResumeUrl { get; set; }
}
