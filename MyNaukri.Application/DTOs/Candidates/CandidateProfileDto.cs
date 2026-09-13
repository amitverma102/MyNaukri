namespace MyNaukri.Application.DTOs.Candidates;

public class CandidateProfileDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string ResumeUrl { get; set; } = string.Empty;
    public string ProfilePictureUrl { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public int TotalExperienceYears { get; set; }
    
    public decimal? CurrentSalary { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string NoticePeriod { get; set; } = string.Empty;
    public string CurrentLocation { get; set; } = string.Empty;
    public string PreferredLocations { get; set; } = string.Empty;
    public string ClassesTaught { get; set; } = string.Empty;
    public string BoardsTaught { get; set; } = string.Empty;
    public string Education { get; set; } = string.Empty;
    public string Certifications { get; set; } = string.Empty;
    
    public string? Gender { get; set; }
    public bool DifferentlyAbled { get; set; }
    public bool ExServiceman { get; set; }
    public string? ExServicemanBranch { get; set; }
    
    public bool IsSubscribedToJobAlerts { get; set; }
    
    // Education & Verification enhancements
    public string? DemoVideoUrl { get; set; }
    public string DemoVideoStatus { get; set; } = "Unverified";
    public string? DemoVideoSubject { get; set; }
    public string? DemoVideoSummary { get; set; }
    public string? DemoVideoRejectionReason { get; set; }
    public DateTime? DemoVideoVerifiedAt { get; set; }
    public bool? IsCtetQualified { get; set; }
    public string? CtetDetails { get; set; }
    public string? CurrentInstitution { get; set; }
    public string? BlockedInstitutions { get; set; }
    public string? JoiningAvailability { get; set; }
}
