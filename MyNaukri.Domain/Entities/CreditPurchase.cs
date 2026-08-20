using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class CreditPurchase : BaseEntity
{
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = null!;
    
    public int CreditsPurchased { get; set; }
    public decimal PricePerCredit { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "INR";
    
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public string? PaymentReference { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    
    public Guid PurchasedByUserId { get; set; }
    public User PurchasedBy { get; set; } = null!;
    
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
}
