namespace MyNaukri.Infrastructure.Services.Email;

public class EmailSettings
{
    public string SmtpServer { get; set; } = string.Empty;
    public int Port { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    public string VerificationSenderName { get; set; } = string.Empty;
    public string VerificationSenderEmail { get; set; } = string.Empty;
    public string VerificationPassword { get; set; } = string.Empty;

    public string JobsSenderName { get; set; } = string.Empty;
    public string JobsSenderEmail { get; set; } = string.Empty;
    public string JobsPassword { get; set; } = string.Empty;
}
