using MyNaukri.Domain.Enums;

namespace MyNaukri.Application.Interfaces;

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body, EmailType emailType = EmailType.Default);
}
