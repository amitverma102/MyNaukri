using Microsoft.Extensions.Logging;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Infrastructure.Services;

public class MockNotificationService : INotificationService
{
    private readonly ILogger<MockNotificationService> _logger;

    public MockNotificationService(ILogger<MockNotificationService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string body, EmailType emailType = EmailType.Default)
    {
        _logger.LogInformation("MOCK EMAIL [{EmailType}] sent to {To}: {Subject}", emailType, to, subject);
        return Task.CompletedTask;
    }

    public Task SendEmailAsync(
        string to,
        string subject,
        string body,
        bool isHtml,
        byte[]? attachmentBytes = null,
        string? attachmentFilename = null,
        string? attachmentContentType = null,
        EmailType emailType = EmailType.Default)
    {
        _logger.LogInformation("MOCK EMAIL [{EmailType}] (isHtml={IsHtml}, attachment={Attachment}) sent to {To}: {Subject}", 
            emailType, isHtml, attachmentFilename ?? "none", to, subject);
        return Task.CompletedTask;
    }
}
