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
}
