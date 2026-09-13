using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.Interfaces;

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body, EmailType emailType = EmailType.Default);

    Task SendEmailAsync(
        string to,
        string subject,
        string body,
        bool isHtml,
        byte[]? attachmentBytes = null,
        string? attachmentFilename = null,
        string? attachmentContentType = null,
        EmailType emailType = EmailType.Default);
}
