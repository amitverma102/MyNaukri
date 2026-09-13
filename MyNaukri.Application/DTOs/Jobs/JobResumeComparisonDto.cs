namespace MyNaukri.Application.DTOs.Jobs;

public class JobResumeComparisonDto
{
    public Guid JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public decimal MatchScore { get; set; } // 0 - 100
    public string FitLevel { get; set; } = "Moderate"; // "High", "Moderate", "Low"
    public string MatchSummary { get; set; } = string.Empty;
    public List<string> MatchedSkills { get; set; } = new();
    public List<string> MissingSkills { get; set; } = new();
    public ExperienceMatchDto ExperienceMatch { get; set; } = new();
    public EducationMatchDto EducationMatch { get; set; } = new();
    public LocationMatchDto LocationMatch { get; set; } = new();
    public List<string> Strengths { get; set; } = new();
    public List<string> ImprovementSuggestions { get; set; } = new();
}

public class ExperienceMatchDto
{
    public string Required { get; set; } = string.Empty;
    public string Candidate { get; set; } = string.Empty;
    public bool IsMatch { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class EducationMatchDto
{
    public string Required { get; set; } = string.Empty;
    public string Candidate { get; set; } = string.Empty;
    public bool IsMatch { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class LocationMatchDto
{
    public string JobLocation { get; set; } = string.Empty;
    public string CandidateLocation { get; set; } = string.Empty;
    public bool IsMatch { get; set; }
    public string Notes { get; set; } = string.Empty;
}
