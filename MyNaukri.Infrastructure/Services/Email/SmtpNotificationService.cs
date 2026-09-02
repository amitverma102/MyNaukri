using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MyNaukri.Application.Interfaces;

using MyNaukri.Domain.Enums;

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

    public async Task SendEmailAsync(string to, string subject, string body, EmailType emailType = EmailType.Default)
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

            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(senderName, senderEmail));
            email.To.Add(MailboxAddress.Parse(to));
            email.Subject = subject;

            var builder = new BodyBuilder
            {
                TextBody = body
            };
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
            // We shouldn't throw here if we want to fail gracefully in background services, 
            // but usually a notification service failure should be logged.
        }
    }
}
