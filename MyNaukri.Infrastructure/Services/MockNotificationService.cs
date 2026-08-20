using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services;

public class MockNotificationService : INotificationService
{
    public Task SendEmailAsync(string to, string subject, string body)
    {
        // Mock email sending by writing to console
        Console.WriteLine($"[EMAIL SENT to {to}] Subject: {subject}");
        Console.WriteLine(body);
        return Task.CompletedTask;
    }
}
