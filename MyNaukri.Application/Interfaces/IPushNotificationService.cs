namespace MyNaukri.Application.Interfaces;

public interface IPushNotificationService
{
    Task SendPushNotificationAsync(Guid userId, string title, string body, object? data = null);
}
