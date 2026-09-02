namespace MyNaukri.Application.Interfaces;

public interface IRazorpayService
{
    Task<string> CreateOrderAsync(decimal amountInInr, string receiptId, Dictionary<string, string>? notes = null);
    bool VerifyPaymentSignature(string orderId, string paymentId, string signature);
    string GetPublicKey();
}
