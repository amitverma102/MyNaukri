using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class AuditLog : BaseEntity
{
    public string Action { get; set; } = string.Empty;
    
    public Guid PerformedByUserId { get; set; }
    public User PerformedByUser { get; set; } = null!;
    
    public Role Role { get; set; }
    
    public Guid? InstitutionId { get; set; }
    public Institution? Institution { get; set; }
    
    // Storing JSON payload or details of the change
    public string Details { get; set; } = string.Empty;
    
    public string? IpAddress { get; set; }
}
