using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class JobRecruiterAssignment : BaseEntity
{
    public Guid JobId { get; set; }
    public Job Job { get; set; } = null!;

    public Guid RecruiterId { get; set; }
    public Recruiter Recruiter { get; set; } = null!;

    public Guid AssignedByUserId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
