using System.ComponentModel.DataAnnotations;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.DTOs.SuperAdmin;

public class DashboardStatsDto
{
    public int TotalInstitutions { get; set; }
    public int ActiveInstitutions { get; set; }
    public int TotalCreditsIssued { get; set; }
    public int TotalCreditsPurchased { get; set; }
    public int TotalCreditsConsumed { get; set; }
    public int TotalCreditsRemaining { get; set; }
}

public class CreateInstitutionDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Code { get; set; } = string.Empty;

    public InstitutionType Type { get; set; }
    
    [Required]
    [Range(0, 10000, ErrorMessage = "Max recruiters must be between 0 and 10000.")]
    public int MaxRecruiters { get; set; } = 5;
    
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    
    [RegularExpression(@"^\d{6}$", ErrorMessage = "PIN Code must be 6 digits.")]
    public string? PINCode { get; set; }
    
    [EmailAddress]
    public string? Email { get; set; }
    
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public string? LogoUrl { get; set; }

    [Required]
    public string AdminFirstName { get; set; } = string.Empty;
    
    [Required]
    public string AdminLastName { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string AdminEmail { get; set; } = string.Empty;
    
    [Required]
    public string AdminPassword { get; set; } = string.Empty;
}

public class AddCreditsDto
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Credits must be a positive number greater than 0.")]
    public int Credits { get; set; }

    [Required]
    public string Reason { get; set; } = string.Empty;
}

public class AddCreditsResponseDto
{
    public Guid InstitutionId { get; set; }
    public int CreditsAdded { get; set; }
    public int BalanceBefore { get; set; }
    public int BalanceAfter { get; set; }
    public string TransactionId { get; set; } = string.Empty;
}

public class PaginatedResultDto<T>
{
    public IEnumerable<T> Items { get; set; } = new List<T>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalRecords { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalRecords / (double)PageSize);
}

public class CreditTransactionDto
{
    public string TransactionId { get; set; } = string.Empty;
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public Guid? RecruiterId { get; set; }
    public string? RecruiterName { get; set; }
    public string? RecruiterEmail { get; set; }
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public int Credits { get; set; }
    public int BalanceBefore { get; set; }
    public int BalanceAfter { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class InstitutionListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public InstitutionType Type { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public InstitutionStatus Status { get; set; }
    public string LogoUrl { get; set; } = string.Empty;
    public int CreditBalance { get; set; }
    public DateTime CreatedDate { get; set; }
    public int MaxRecruiters { get; set; }
}

public class UpdateMaxRecruitersDto
{
    [Required]
    [Range(0, 10000, ErrorMessage = "Max recruiters must be between 0 and 10000.")]
    public int MaxRecruiters { get; set; }
}
