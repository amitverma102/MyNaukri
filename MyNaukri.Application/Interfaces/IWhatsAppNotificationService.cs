using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyNaukri.Application.Interfaces;

public interface IWhatsAppNotificationService
{
    Task<bool> SendTextMessageAsync(string recipientPhone, string message, string messageType = "Custom");
    
    Task<bool> SendJobApplicationSubmittedAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        Guid applicationId);

    Task<bool> SendNewApplicationRecruiterAlertAsync(
        string recruiterPhone, 
        string recruiterName, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        Guid applicationId);

    Task<bool> SendApplicationStatusUpdateAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        string newStatus, 
        string? note);

    Task<bool> SendInterviewScheduledCandidateAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink, 
        bool isReschedule, 
        string? rescheduleReason);

    Task<bool> SendInterviewScheduledRecruiterAsync(
        string recruiterPhone, 
        string recruiterName, 
        string candidateName, 
        string jobTitle, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink, 
        bool isReschedule);

    Task<bool> SendInterview30MinReminderCandidateAsync(
        string candidatePhone, 
        string candidateName, 
        string jobTitle, 
        string institutionName, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink);

    Task<bool> SendInterview30MinReminderRecruiterAsync(
        string recruiterPhone, 
        string recruiterName, 
        string candidateName, 
        string jobTitle, 
        DateTime interviewDateUtc, 
        string mode, 
        string locationOrLink);

    IReadOnlyList<WhatsAppMessageRecord> GetRecentMessages();
}

public class WhatsAppMessageRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RecipientPhone { get; set; } = string.Empty;
    public string MessageType { get; set; } = string.Empty;
    public string MessageText { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsLiveDispatched { get; set; }
    public string Status { get; set; } = "Sent";
}
