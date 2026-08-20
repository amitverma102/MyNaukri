using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class Institution : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    
    public ICollection<Recruiter> Recruiters { get; set; } = new List<Recruiter>();
    public ICollection<Job> Jobs { get; set; } = new List<Job>();
}
