using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class JobApplicationComment : BaseEntity
{
    public Guid JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;
    
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string Comment { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
}
