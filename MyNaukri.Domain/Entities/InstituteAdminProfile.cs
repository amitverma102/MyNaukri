using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class InstituteAdminProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;
}
