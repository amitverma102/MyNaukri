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
}
