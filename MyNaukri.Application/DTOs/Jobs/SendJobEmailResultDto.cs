using MyNaukri.Application.DTOs.Candidates;

namespace MyNaukri.Application.DTOs.Jobs;

public class SendJobEmailResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int CreditsDeducted { get; set; }
    public int EmailCost { get; set; }
    public int ContactUnlockCost { get; set; }
    public int ResumeUnlockCost { get; set; }
    public int RemainingBalance { get; set; }
    public CandidateSearchResultDto? Candidate { get; set; }
}
