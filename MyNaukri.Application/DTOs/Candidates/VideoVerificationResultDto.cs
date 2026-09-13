using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.Candidates;

public class VideoVerificationResultDto
{
    public VideoVerificationStatus Status { get; set; } = VideoVerificationStatus.Unverified;
    public bool IsSafe { get; set; }
    public bool IsTeachingRelated { get; set; }
    public string? Subject { get; set; }
    public string? TargetAudience { get; set; }
    public string? Summary { get; set; }
    public string? RejectionReason { get; set; }
    public double ConfidenceScore { get; set; }
    public List<string> SafetyFlags { get; set; } = new();
}
