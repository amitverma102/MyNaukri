using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class ExpoPushNotificationService : IPushNotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ExpoPushNotificationService> _logger;
    private readonly HttpClient _httpClient;

    public ExpoPushNotificationService(ApplicationDbContext context, ILogger<ExpoPushNotificationService> logger)
    {
        _context = context;
        _logger = logger;
        _httpClient = new HttpClient();
    }

    public async Task SendPushNotificationAsync(Guid userId, string title, string body, object? data = null)
    {
        try
        {
            var tokens = await _context.DeviceTokens
                .Where(t => t.UserId == userId)
                .Select(t => t.Token)
                .ToListAsync();

            if (!tokens.Any())
            {
                _logger.LogInformation("No device tokens found for user {UserId}", userId);
                return;
            }

            var messages = tokens.Select(token => new
            {
                to = token,
                sound = "default",
                title = title,
                body = body,
                data = data
            }).ToList();

            var response = await _httpClient.PostAsJsonAsync("https://exp.host/--/api/v2/push/send", messages);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully sent push notification to user {UserId} ({Count} devices)", userId, tokens.Count);
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Expo push notification returned status {StatusCode}: {Error}", response.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch push notification to user {UserId}", userId);
        }
    }
}
