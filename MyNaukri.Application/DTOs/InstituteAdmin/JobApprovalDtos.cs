using System;

namespace MyNaukri.Application.DTOs.InstituteAdmin;

public class JobApprovalDecisionDto
{
    public string? Comment { get; set; }
}

public class ApprovalSettingsDto
{
    public bool RequireJobApproval { get; set; }
}

public class InstitutionJobApprovalsResponseDto
{
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int TotalCount { get; set; }
    public List<MyNaukri.Application.DTOs.Jobs.JobDto> Jobs { get; set; } = new();
}
