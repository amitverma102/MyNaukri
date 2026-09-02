using MyNaukri.Domain.Common;

namespace MyNaukri.Domain.Entities;

public class CreditTransactionBatch : BaseEntity
{
    public Guid CreditTransactionId { get; set; }
    public CreditTransaction CreditTransaction { get; set; } = null!;

    public Guid CreditBatchId { get; set; }
    public CreditBatch CreditBatch { get; set; } = null!;

    public int Quantity { get; set; }
}
