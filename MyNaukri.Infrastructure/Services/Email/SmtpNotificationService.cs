using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using System.Text.RegularExpressions;

namespace MyNaukri.Infrastructure.Services.Email;

public class SmtpNotificationService : INotificationService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpNotificationService> _logger;

    public SmtpNotificationService(IOptions<EmailSettings> options, ILogger<SmtpNotificationService> logger)
    {
        _settings = options.Value;
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string body, EmailType emailType = EmailType.Default)
    {
        bool isHtml = body.Contains("<") && body.Contains(">");
        return SendEmailAsync(to, subject, body, isHtml, null, null, null, emailType);
    }

    public async Task SendEmailAsync(
        string to,
        string subject,
        string body,
        bool isHtml,
        byte[]? attachmentBytes = null,
        string? attachmentFilename = null,
        string? attachmentContentType = null,
        EmailType emailType = EmailType.Default)
    {
        try
        {
            var senderName = _settings.SenderName;
            var senderEmail = _settings.SenderEmail;
            var password = _settings.Password;

            if (emailType == EmailType.Verification && !string.IsNullOrEmpty(_settings.VerificationSenderEmail))
            {
                senderName = _settings.VerificationSenderName;
                senderEmail = _settings.VerificationSenderEmail;
                password = _settings.VerificationPassword;
            }
            else if (emailType == EmailType.JobAlert && !string.IsNullOrEmpty(_settings.JobsSenderEmail))
            {
                senderName = _settings.JobsSenderName;
                senderEmail = _settings.JobsSenderEmail;
                password = _settings.JobsPassword;
            }

            // Ensure sender display name is branded and not a bare generic word like "Jobs"
            if (string.IsNullOrWhiteSpace(senderName) || senderName.Trim().Equals("Jobs", StringComparison.OrdinalIgnoreCase))
            {
                senderName = "EduKey360 Jobs";
            }
            else if (!senderName.Contains("EduKey360", StringComparison.OrdinalIgnoreCase))
            {
                senderName = $"EduKey360 {senderName}".Trim();
            }

            var senderMailbox = new MailboxAddress(senderName, senderEmail);
            var email = new MimeMessage();
            email.From.Add(senderMailbox);
            email.Sender = senderMailbox;
            email.To.Add(MailboxAddress.Parse(to));
            email.Subject = subject;
            email.Date = DateTimeOffset.UtcNow;

            // Extract sender domain for RFC-compliant Message-Id alignment (critical for anti-spam filters)
            var senderDomain = senderEmail.Contains('@') ? senderEmail.Split('@')[1] : "edukey360.com";
            email.MessageId = $"{Guid.NewGuid():N}@{senderDomain}";

            // Set explicit Reply-To to legitimate contact address
            var replyToEmail = !string.IsNullOrEmpty(_settings.SenderEmail) ? _settings.SenderEmail : "support@edukey360.com";
            email.ReplyTo.Add(new MailboxAddress("EduKey360 Support", replyToEmail));

            // Deliverability & anti-spam compliance headers:
            // List-Unsubscribe is strictly for marketing/bulk emails (Job Alerts), NOT for transactional 1-to-1 emails
            if (emailType == EmailType.JobAlert)
            {
                email.Headers.Add(HeaderId.ListUnsubscribe, $"<mailto:unsubscribe@{senderDomain}?subject=unsubscribe>");
                email.Headers.Add(HeaderId.ListUnsubscribePost, "List-Unsubscribe=One-Click");
            }

            email.Headers.Add("X-Auto-Response-Suppress", "DR, RN, NRN, OOF, AutoReply");
            email.Headers.Add("X-Report-Abuse", $"mailto:abuse@{senderDomain}");
            email.Headers.Add("Feedback-ID", $"{emailType}:edukey360:transactional");

            var builder = new BodyBuilder();
            if (isHtml)
            {
                builder.HtmlBody = body;
                builder.TextBody = ConvertHtmlToPlainText(body);
            }
            else
            {
                builder.TextBody = body;
            }

            if (attachmentBytes != null && !string.IsNullOrEmpty(attachmentFilename))
            {
                var contentType = string.IsNullOrEmpty(attachmentContentType) 
                    ? ContentType.Parse("application/octet-stream") 
                    : ContentType.Parse(attachmentContentType);
                builder.Attachments.Add(attachmentFilename, attachmentBytes, contentType);
            }

            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            
            // Note: SecureSocketOptions.Auto will automatically determine whether to use SSL or STARTTLS based on the port
            await smtp.ConnectAsync(_settings.SmtpServer, _settings.Port, SecureSocketOptions.Auto);
            await smtp.AuthenticateAsync(senderEmail, password);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {To} with Subject {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
        }
    }

    /// <summary>
    /// Converts rich HTML into clean, human-readable plain text for the multipart/alternative fallback.
    /// Strips style blocks and script tags completely so CSS rules never leak into the plain text body,
    /// avoiding high-spam-score triggers like CSS_IN_TEXT or BAYES_99.
    /// </summary>
    public static string ConvertHtmlToPlainText(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;

        // 1. Remove style and script blocks completely along with their inner CSS/JS code
        var noStyleOrScript = Regex.Replace(html, @"<(style|script)[^>]*>[\s\S]*?</\1>", "", RegexOptions.IgnoreCase);

        // 2. Convert common block-level HTML tags and line breaks to newlines
        var withLineBreaks = Regex.Replace(noStyleOrScript, @"<(br|p|div|tr|h[1-6])[^>]*>", "\n", RegexOptions.IgnoreCase);

        // 3. Remove all remaining tags
        var noTags = Regex.Replace(withLineBreaks, @"<[^>]+>", "");

        // 4. Decode HTML entities (e.g. &nbsp;, &amp;, &bull;)
        var decoded = System.Net.WebUtility.HtmlDecode(noTags);

        // 5. Clean up whitespace while preserving paragraph separation
        var lines = decoded.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                           .Select(line => Regex.Replace(line, @"[ \t]+", " ").Trim())
                           .Where(line => !string.IsNullOrWhiteSpace(line));

        return string.Join("\n\n", lines);
    }
}
