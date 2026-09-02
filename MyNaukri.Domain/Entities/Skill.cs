using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class Skill : BaseEntity
{
    public string DisplayName { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    
    public ICollection<CandidateSkill> CandidateSkills { get; set; } = new List<CandidateSkill>();
}
