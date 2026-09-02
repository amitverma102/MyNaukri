using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.SuperAdmin;

public class CreditActivityReportFilterDto
{
    public Guid? InstitutionId { get; set; }
    public TransactionType? TransactionType { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
