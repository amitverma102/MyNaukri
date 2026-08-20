namespace MyNaukri.Application.DTOs.Credits;

public class CreditTransactionDto
{
    public Guid Id { get; set; }
    public Guid RecruiterId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public int Credits { get; set; }
    public int BalanceBefore { get; set; }
    public int BalanceAfter { get; set; }
    public string? ReferenceId { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
