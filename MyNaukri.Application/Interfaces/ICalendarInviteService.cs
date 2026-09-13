namespace MyNaukri.Application.Interfaces;

public interface ICalendarInviteService
{
    string GenerateIcsContent(
        string eventId,
        string title,
        string description,
        string locationOrLink,
        DateTime startDateTimeUtc,
        int durationMinutes = 45,
        string organizerEmail = "interviews@edukey360.com",
        string organizerName = "EduKey360 Recruiter",
        string method = "PUBLISH");
}
