namespace MyNaukri.Application.DTOs.Candidates;

public class UpdateCandidateProfileDto
{
    public string? PhoneNumber { get; set; }
    public string? Skills { get; set; }
    public string? Summary { get; set; }
    public int TotalExperienceYears { get; set; }
    public decimal? CurrentSalary { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string? NoticePeriod { get; set; }
    public string? CurrentLocation { get; set; }
    public string? PreferredLocations { get; set; }
    public string? ClassesTaught { get; set; }
    public string? BoardsTaught { get; set; }
    public string? Education { get; set; }
    public string? Certifications { get; set; }
    
    public string? Gender { get; set; }
    public bool DifferentlyAbled { get; set; }
    public bool ExServiceman { get; set; }
    public string? ExServicemanBranch { get; set; }
}
