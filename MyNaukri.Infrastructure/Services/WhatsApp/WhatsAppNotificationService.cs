using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services.WhatsApp;

public class WhatsAppNotificationService : IWhatsAppNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly WhatsAppSettings _settings;
    private readonly ILogger<WhatsAppNotificationService> _logger;
    private readonly TimeZoneInfo _istTimeZone;

    // In-memory thread-safe buffer of recent WhatsApp messages for diagnostics and automated testing
    private static readonly ConcurrentQueue<WhatsAppMessageRecord> _recentMessages = new();
    private const int MaxRecentMessages = 100;

    public WhatsAppNotificationService(
        HttpClient httpClient,
        IOptions<WhatsAppSettings> options,
        IConfiguration config,
        ILogger<WhatsAppNotificationService> logger)
    {
        _httpClient = httpClient;
        _settings = options.Value ?? new WhatsAppSettings();
        _logger = logger;

        // Fallback to configuration if options not bound directly
        if (string.IsNullOrWhiteSpace(_settings.AccessToken))
        {
            _settings.AccessToken = config["Meta:WhatsApp:AccessToken"] ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(_settings.PhoneNumberId))
        {
            _settings.PhoneNumberId = config["Meta:WhatsApp:PhoneNumberId"] ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(_settings.VerifyToken))
        {
            _settings.VerifyToken = config["Meta:WhatsApp:VerifyToken"] ?? "edukey_whatsapp_secret_2026";
        }
        if (string.IsNullOrWhiteSpace(_settings.BaseUrl))
        {
            _settings.BaseUrl = config["AppUrl"] ?? "https://edukey360.com";
        }

        try
        {
            _istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        }
        catch
        {
            try
            {
                _istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
            }
            catch
            {
                _istTimeZone = TimeZoneInfo.Utc;
            }
        }
    }

    public async Task<bool> SendTextMessageAsync(string recipientPhone, string message, string messageType = "Custom")
    {
        var cleanPhone = CleanPhoneNumber(recipientPhone);
        if (string.IsNullOrWhiteSpace(cleanPhone) || cleanPhone.Length < 10)
        {
            _logger.LogWarning("[WhatsApp] Invalid recipient phone number '{Phone}'. Skipping dispatch.", recipientPhone);
            return false;
        }

        var isLiveDispatched = false;
        var status = "Sent (Simulated)";

        // Live Meta WhatsApp Cloud API dispatch
        if (!string.IsNullOrWhiteSpace(_settings.AccessToken) && !string.IsNullOrWhiteSpace(_settings.PhoneNumberId))
        {
            try
            {
                var url = $"https://graph.facebook.com/v18.0/{_settings.PhoneNumberId}/messages";
                using var request = new HttpRequestMessage(HttpMethod.Post, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.AccessToken);

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = cleanPhone,
                    type = "text",
                    text = new { preview_url = true, body = message }
                };

                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    isLiveDispatched = true;
                    status = "Delivered (Meta API)";
                    _logger.LogInformation("[Meta WhatsApp Cloud API] Dispatched live message to {Phone} (Type: {Type})", cleanPhone, messageType);
                }
                else
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    status = $"Meta Error {response.StatusCode}";
                    _logger.LogError("[Meta WhatsApp Cloud API] Failed to send message to {Phone}: {Status} - {Body}", cleanPhone, response.StatusCode, errorBody);
                }
            }
            catch (Exception ex)
            {
                status = $"Exception: {ex.Message}";
                _logger.LogError(ex, "[Meta WhatsApp Cloud API] Exception sending to {Phone}", cleanPhone);
            }
        }
        else
        {
            _logger.LogInformation("[Meta WhatsApp Cloud API - Simulated Mode] To: {Phone} (Type: {Type})\n{Message}",
                cleanPhone, messageType, message);
        }

        var record = new WhatsAppMessageRecord
        {
            RecipientPhone = cleanPhone,
            MessageType = messageType,
            MessageText = message,
            SentAt = DateTime.UtcNow,
            IsLiveDispatched = isLiveDispatched,
            Status = status
        };

        _recentMessages.Enqueue(record);
        while (_recentMessages.Count > MaxRecentMessages)
        {
            _recentMessages.TryDequeue(out _);
        }

        return true;
    }

    public Task<bool> SendJobApplicationSubmittedAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        Guid applicationId)
    {
        var shortId = applicationId.ToString().Substring(0, Math.Min(8, applicationId.ToString().Length));
        var msg = $"✅ *Application Submitted - EduKey360*\n\n" +
                  $"Dear *{candidateName}*,\n" +
                  $"Your application has been successfully submitted for:\n\n" +
                  $"📋 *Job:* {jobTitle}\n" +
                  $"🏫 *Institution:* {institutionName}\n" +
                  $"🆔 *Application ID:* #{shortId}\n\n" +
                  $"You will receive status updates as the hiring team reviews your profile.\n" +
                  $"🔗 *Track Application:* {_settings.BaseUrl}/candidate/applications";

        return SendTextMessageAsync(candidatePhone, msg, "ApplicationSubmittedCandidate");
    }

    public Task<bool> SendNewApplicationRecruiterAlertAsync(
        string recruiterPhone, 
        string recruiterName, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        Guid applicationId)
    {
        var msg = $"🔔 *New Job Application Alert - EduKey360*\n\n" +
                  $"Hello *{recruiterName}*,\n" +
                  $"A new candidate has applied for your job opening:\n\n" +
                  $"👤 *Candidate:* {candidateName}\n" +
                  $"📋 *Job Title:* {jobTitle}\n" +
                  $"🏫 *Institution:* {institutionName}\n\n" +
                  $"Review candidate resume, AI match score, and take action now:\n" +
                  $"🔗 {_settings.BaseUrl}/recruiter/dashboard";

        return SendTextMessageAsync(recruiterPhone, msg, "NewApplicationRecruiterAlert");
    }

    public Task<bool> SendApplicationStatusUpdateAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        string newStatus, 
        string? note)
    {
        var noteSection = !string.IsNullOrWhiteSpace(note)
            ? $"\n📝 *Feedback / Note:* {note.Trim()}\n"
            : "\n";

        var msg = $"📢 *Application Status Updated - EduKey360*\n\n" +
                  $"Dear *{candidateName}*,\n" +
                  $"Your application for *{jobTitle}* at *{institutionName}* has been updated to:\n\n" +
                  $"🎯 *Status:* *{newStatus}*{noteSection}\n" +
                  $"View complete timeline and details:\n" +
                  $"🔗 {_settings.BaseUrl}/candidate/applications";

        return SendTextMessageAsync(candidatePhone, msg, "ApplicationStatusUpdateCandidate");
    }

    public Task<bool> SendInterviewScheduledCandidateAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink, 
        bool isReschedule, 
        string? rescheduleReason)
    {
        var timeIst = FormatIst(interviewDateUtc);
        var headline = isReschedule ? "📅 *Interview Rescheduled - EduKey360*" : "📅 *Interview Scheduled - EduKey360*";
        var reasonLine = isReschedule && !string.IsNullOrWhiteSpace(rescheduleReason)
            ? $"\n📝 *Reason:* {rescheduleReason.Trim()}\n"
            : "\n";

        var msg = $"{headline}\n\n" +
                  $"Dear *{candidateName}*,\n" +
                  $"Your interview with *{institutionName}* has been {(isReschedule ? "rescheduled" : "confirmed")}:\n\n" +
                  $"📋 *Position:* {jobTitle}\n" +
                  $"🕒 *Date & Time:* *{timeIst}*\n" +
                  $"📍 *Mode:* {mode}\n" +
                  $"🔗 *Venue / Meeting Link:* {locationOrLink}{reasonLine}\n" +
                  $"Please be ready 5 minutes before time. All the best! 🎓";

        return SendTextMessageAsync(candidatePhone, msg, isReschedule ? "InterviewRescheduledCandidate" : "InterviewScheduledCandidate");
    }

    public Task<bool> SendInterviewScheduledRecruiterAsync(
        string recruiterPhone, 
        string recruiterName, 
        string candidateName, 
        string jobTitle, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink, 
        bool isReschedule)
    {
        var timeIst = FormatIst(interviewDateUtc);
        var headline = isReschedule ? "📅 *Interview Rescheduled Confirmed - EduKey360*" : "📅 *Interview Scheduled Confirmed - EduKey360*";

        var msg = $"{headline}\n\n" +
                  $"Hello *{recruiterName}*,\n" +
                  $"Interview {(isReschedule ? "rescheduled" : "scheduled")} with candidate *{candidateName}*:\n\n" +
                  $"📋 *Position:* {jobTitle}\n" +
                  $"🕒 *Date & Time:* *{timeIst}*\n" +
                  $"📍 *Mode:* {mode}\n" +
                  $"🔗 *Venue / Meeting Link:* {locationOrLink}\n\n" +
                  $"Manage responses on EduKey360:\n" +
                  $"🔗 {_settings.BaseUrl}/recruiter/dashboard";

        return SendTextMessageAsync(recruiterPhone, msg, isReschedule ? "InterviewRescheduledRecruiter" : "InterviewScheduledRecruiter");
    }

    public Task<bool> SendInterview30MinReminderCandidateAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink)
    {
        var timeIst = FormatIst(interviewDateUtc);
        var msg = $"⏰ *Interview Starting in 30 Minutes! - EduKey360*\n\n" +
                  $"Dear *{candidateName}*,\n" +
                  $"This is a reminder that your interview begins in approximately *30 minutes*:\n\n" +
                  $"📋 *Position:* {jobTitle}\n" +
                  $"🏫 *Institution:* {institutionName}\n" +
                  $"🕒 *Scheduled Time:* *{timeIst}*\n" +
                  $"📍 *Mode:* {mode}\n" +
                  $"🔗 *Link / Venue:* {locationOrLink}\n\n" +
                  $"Please join 5 minutes early to test your audio/video setup. Good luck! 🌟";

        return SendTextMessageAsync(candidatePhone, msg, "Interview30MinReminderCandidate");
    }

    public Task<bool> SendInterview30MinReminderRecruiterAsync(
        string recruiterPhone, 
        string recruiterName, 
        string candidateName, 
        string jobTitle, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink)
    {
        var timeIst = FormatIst(interviewDateUtc);
        var msg = $"⏰ *Upcoming Interview in 30 Minutes - EduKey360*\n\n" +
                  $"Hello *{recruiterName}*,\n" +
                  $"Your interview with *{candidateName}* starts in approximately *30 minutes*:\n\n" +
                  $"📋 *Position:* {jobTitle}\n" +
                  $"🕒 *Scheduled Time:* *{timeIst}*\n" +
                  $"📍 *Mode:* {mode}\n" +
                  $"🔗 *Link / Venue:* {locationOrLink}\n\n" +
                  $"Candidate details & evaluation sheet are ready in your dashboard:\n" +
                  $"🔗 {_settings.BaseUrl}/recruiter/dashboard";

        return SendTextMessageAsync(recruiterPhone, msg, "Interview30MinReminderRecruiter");
    }

    public IReadOnlyList<WhatsAppMessageRecord> GetRecentMessages()
    {
        return _recentMessages.ToArray();
    }

    public static string CleanPhoneNumber(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var digitsOnly = new string(phone.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length == 10)
        {
            digitsOnly = "91" + digitsOnly;
        }
        return digitsOnly;
    }

    private string FormatIst(DateTime utcDate)
    {
        var istTime = TimeZoneInfo.ConvertTimeFromUtc(
            utcDate.Kind == DateTimeKind.Utc ? utcDate : DateTime.SpecifyKind(utcDate, DateTimeKind.Utc), 
            _istTimeZone);
        return $"{istTime:dd-MM-yyyy, hh:mm tt} IST";
    }
}
