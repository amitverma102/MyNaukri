namespace MyNaukri.Application.DTOs.Jobs;

public class CandidateJobEmailCostDto
{
    public Guid CandidateId { get; set; }
    public string CandidateName { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public Guid JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public int EmailCost { get; set; }
    public int ContactUnlockCost { get; set; }
    public int ResumeUnlockCost { get; set; }
    public int TotalCost { get; set; }
    public bool IsContactUnlocked { get; set; }
    public bool IsResumeUnlocked { get; set; }
    public int CurrentBalance { get; set; }
    public bool HasSufficientBalance { get; set; }
}
