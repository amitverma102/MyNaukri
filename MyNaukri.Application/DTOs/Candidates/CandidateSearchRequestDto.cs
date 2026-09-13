using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.Candidates;

public class CandidateSearchRequestDto
{
    public string? Keyword { get; set; }
    public string? Location { get; set; }
    public int? MinExperienceYears { get; set; }
    public int? MaxExperienceYears { get; set; }
    
    // New Filters
    public Gender? Gender { get; set; }
    public bool? DifferentlyAbled { get; set; }
    public bool? ExServiceman { get; set; }
    public ExServicemanBranch? ExServicemanBranch { get; set; }
    
    // Additional Resdex Filters
    public string? NoticePeriod { get; set; }
    public string? ClassesTaught { get; set; }
    public string? BoardsTaught { get; set; }
    public bool? IsCtetQualified { get; set; }
    public bool? VerifiedDemoOnly { get; set; }
    public decimal? MinExpectedSalary { get; set; }
    public decimal? MaxExpectedSalary { get; set; }
    public int? LastUpdatedDays { get; set; }
    public string? SortBy { get; set; }
}
