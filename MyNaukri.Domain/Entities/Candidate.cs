using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class Candidate : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string PhoneNumber { get; set; } = string.Empty; // Should be encrypted
    public string ResumeUrl { get; set; } = string.Empty;
    public string ProfilePictureUrl { get; set; } = string.Empty;
    
    // Resume processing fields
    public Enums.ProfileSource ProfileSource { get; set; } = Enums.ProfileSource.SELF_REGISTERED;
    public DateTime? ProfileLastParsedAt { get; set; }

    // AI Extracted/Mapped properties
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
    
    // New fields
    public Enums.Gender? Gender { get; set; }
    public bool DifferentlyAbled { get; set; }
    public bool ExServiceman { get; set; }
    public Enums.ExServicemanBranch? ExServicemanBranch { get; set; }
    
    public bool IsSubscribedToJobAlerts { get; set; } = true;
    
    // Education & Verification enhancements
    public string? DemoVideoUrl { get; set; }
    public Enums.VideoVerificationStatus DemoVideoStatus { get; set; } = Enums.VideoVerificationStatus.Unverified;
    public string? DemoVideoSubject { get; set; }
    public string? DemoVideoSummary { get; set; }
    public string? DemoVideoRejectionReason { get; set; }
    public DateTime? DemoVideoVerifiedAt { get; set; }
    public bool? IsCtetQualified { get; set; }
    public string? CtetDetails { get; set; }
    public string? CurrentInstitution { get; set; }
    public string? BlockedInstitutions { get; set; }
    public string? JoiningAvailability { get; set; }

    public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
    public ICollection<Resume> Resumes { get; set; } = new List<Resume>();
    public ICollection<CandidateSkill> CandidateSkills { get; set; } = new List<CandidateSkill>();
}
