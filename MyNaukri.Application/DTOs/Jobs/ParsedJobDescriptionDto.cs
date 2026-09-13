using System.Collections.Generic;

namespace MyNaukri.Application.DTOs.Jobs;

public class ParsedJobDescriptionDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Requirements { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string JobType { get; set; } = "FullTime";
    public string WorkMode { get; set; } = "OnSite";
    public string BoardAffiliation { get; set; } = string.Empty;
    public string SubjectDepartment { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public int? MinExperienceYears { get; set; }
    public int? MaxExperienceYears { get; set; }
    public List<string> SuggestedScreeningQuestions { get; set; } = new();
    public string RawTextPreview { get; set; } = string.Empty;
}
