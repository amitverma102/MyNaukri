using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class SavedJob : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;
    
    public Guid JobId { get; set; }
    public Job Job { get; set; } = null!;
}
