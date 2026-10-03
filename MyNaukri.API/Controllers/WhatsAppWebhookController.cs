using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Services.WhatsApp;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly IWhatsAppNotificationService _whatsAppService;
    private readonly WhatsAppSettings _settings;
    private readonly ILogger<WhatsAppWebhookController> _logger;

    public WhatsAppWebhookController(
        IWhatsAppNotificationService whatsAppService,
        IOptions<WhatsAppSettings> options,
        IConfiguration config,
        ILogger<WhatsAppWebhookController> logger)
    {
        _whatsAppService = whatsAppService;
        _settings = options.Value ?? new WhatsAppSettings();
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_settings.VerifyToken))
        {
            _settings.VerifyToken = config["Meta:WhatsApp:VerifyToken"] ?? "edukey_whatsapp_secret_2026";
        }
    }

    /// <summary>
    /// Meta WhatsApp Cloud API Webhook Subscription Verification (Handshake)
    /// </summary>
    [HttpGet("webhook")]
    [AllowAnonymous]
    public IActionResult VerifyWebhook(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? token,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        var configuredToken = _settings.VerifyToken;

        if (mode == "subscribe" && token == configuredToken)
        {
            _logger.LogInformation("[WhatsApp Webhook] Subscription verified successfully with Meta.");
            return Content(challenge ?? string.Empty, "text/plain");
        }

        _logger.LogWarning("[WhatsApp Webhook] Verification token mismatch. Expected: {Expected}, Received: {Received}",
            configuredToken, token);
        return Forbid();
    }

    /// <summary>
    /// Meta WhatsApp Cloud API Inbound Webhook (Message receipts and status notifications)
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> ReceiveWebhook([FromBody] JsonElement payload)
    {
        try
        {
            var raw = payload.GetRawText();
            _logger.LogInformation("[WhatsApp Webhook] Received webhook payload: {Payload}", raw);

            // Return 200 OK fast as required by Meta webhook specifications
            return Ok(new { status = "RECEIVED" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WhatsApp Webhook] Error processing incoming webhook payload.");
            return Ok(); // Meta expects 200 to prevent webhook deactivation
        }
    }

    /// <summary>
    /// Test WhatsApp Message Dispatch (Simulated or Live depending on Meta credentials)
    /// </summary>
    [HttpPost("send-test")]
    [Authorize(Roles = "SuperAdministrator,InstituteAdministrator,Recruiter")]
    public async Task<IActionResult> SendTestMessage([FromBody] SendTestWhatsAppRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest("Recipient phone number is required.");
        }

        var message = !string.IsNullOrWhiteSpace(request.Message)
            ? request.Message
            : "🔔 *EduKey360 Test Message*\nWhatsApp integration is active and functioning properly!";

        var success = await _whatsAppService.SendTextMessageAsync(request.Phone, message, "TestMessage");
        return Ok(new
        {
            success,
            phone = WhatsAppNotificationService.CleanPhoneNumber(request.Phone),
            message
        });
    }

    /// <summary>
    /// Retrieve recent sent messages for diagnostics
    /// </summary>
    [HttpGet("recent-messages")]
    [Authorize(Roles = "SuperAdministrator,InstituteAdministrator")]
    public IActionResult GetRecentMessages()
    {
        var messages = _whatsAppService.GetRecentMessages();
        return Ok(messages);
    }
}

public class SendTestWhatsAppRequest
{
    public string Phone { get; set; } = string.Empty;
    public string? Message { get; set; }
}
