using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class RechargePlan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int DurationValue { get; set; }
    public RechargeDurationUnit DurationUnit { get; set; }
    public decimal BasePrice { get; set; }
    public int Credits { get; set; }
    public bool IsActive { get; set; } = true;
}
