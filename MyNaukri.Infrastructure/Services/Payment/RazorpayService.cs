using Microsoft.Extensions.Options;
using MyNaukri.Application.Interfaces;
using Razorpay.Api;
using Razorpay.Api.Errors;

namespace MyNaukri.Infrastructure.Services.Payment;

public class RazorpayService : IRazorpayService
{
    private readonly RazorpaySettings _settings;

    public RazorpayService(IOptions<RazorpaySettings> options)
    {
        _settings = options.Value;
    }

    public Task<string> CreateOrderAsync(decimal amountInInr, string receiptId, Dictionary<string, string>? notes = null)
    {
        var client = new RazorpayClient(_settings.KeyId, _settings.KeySecret);

        // Razorpay expects amount in paise (multiply by 100)
        var options = new Dictionary<string, object>
        {
            { "amount", (int)(amountInInr * 100) },
            { "currency", "INR" },
            { "receipt", receiptId }
        };

        if (notes != null && notes.Count > 0)
        {
            options.Add("notes", notes);
        }

        var order = client.Order.Create(options);
        return Task.FromResult(order["id"].ToString());
    }

    public bool VerifyPaymentSignature(string orderId, string paymentId, string signature)
    {
        try
        {
            var attributes = new Dictionary<string, string>
            {
                { "razorpay_payment_id", paymentId },
                { "razorpay_order_id", orderId },
                { "razorpay_signature", signature }
            };

            Utils.verifyPaymentSignature(attributes);
            return true;
        }
        catch (SignatureVerificationError)
        {
            return false;
        }
    }

    public string GetPublicKey() => _settings.KeyId;
}
