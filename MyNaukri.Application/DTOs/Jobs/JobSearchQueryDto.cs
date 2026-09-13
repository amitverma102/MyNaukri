using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.Jobs;

public class JobSearchQueryDto
{
    public string? Query { get; set; }
    public string? Location { get; set; }
    public JobType? JobType { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string? BoardAffiliation { get; set; }
    public string? WorkMode { get; set; }
    public string? SubjectDepartment { get; set; }
    public int? PostedWithinDays { get; set; } // 1, 3, 7, 15, 30
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; } // "date", "salary", "relevance"
}
