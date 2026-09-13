namespace MyNaukri.Application.DTOs.Jobs;

public class TailoredResumeDto
{
    public Guid JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string TailoredHeadline { get; set; } = string.Empty;
    public string TailoredSummary { get; set; } = string.Empty;
    public List<string> TailoredBulletPoints { get; set; } = new();
    public List<string> RecommendedSkillsToAdd { get; set; } = new();
    public string CoverNotePitch { get; set; } = string.Empty;
}
