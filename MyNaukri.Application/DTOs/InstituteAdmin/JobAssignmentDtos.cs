using System;
using System.Collections.Generic;

namespace MyNaukri.Application.DTOs.InstituteAdmin;

public class JobAccessConfigDto
{
    public Guid JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public Guid OwnerRecruiterId { get; set; }
    public string OwnerRecruiterName { get; set; } = string.Empty;
    public bool IsRestrictedAccess { get; set; }
    public List<Guid> AssignedRecruiterIds { get; set; } = new();
    public List<AssignedRecruiterInfoDto> AssignedRecruiters { get; set; } = new();
}

public class UpdateJobAccessDto
{
    public bool IsRestrictedAccess { get; set; }
    public List<Guid> AssignedRecruiterIds { get; set; } = new();
}

public class AssignedRecruiterInfoDto
{
    public Guid RecruiterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
}

public class ReassignJobDto
{
    public Guid TargetRecruiterId { get; set; }
}
