namespace MyNaukri.Infrastructure.Services.WhatsApp;

public class WhatsAppSettings
{
    public string VerifyToken { get; set; } = "edukey_whatsapp_secret_2026";
    public string AccessToken { get; set; } = string.Empty;
    public string PhoneNumberId { get; set; } = string.Empty;
    public string BusinessAccountId { get; set; } = string.Empty;
    public string SenderPhoneNumber { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://edukey360.com";
    public bool EnableSimulationMode { get; set; } = true;
}
