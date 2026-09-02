using System;

namespace MyNaukri.Domain.Entities;

public class CandidateSkill
{
    public Guid CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;

    public Guid SkillId { get; set; }
    public Skill Skill { get; set; } = null!;

    public string Source { get; set; } = string.Empty; // e.g. "ResumeUpload", "SelfRegistered"
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
