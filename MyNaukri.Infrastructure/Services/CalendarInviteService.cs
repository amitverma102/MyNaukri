using System.Text;
using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services;

public class CalendarInviteService : ICalendarInviteService
{
    public string GenerateIcsContent(
        string eventId,
        string title,
        string description,
        string locationOrLink,
        DateTime startDateTimeUtc,
        int durationMinutes = 45,
        string organizerEmail = "interviews@edukey360.com",
        string organizerName = "EduKey360 Recruiter",
        string method = "PUBLISH")
    {
        var endDateTimeUtc = startDateTimeUtc.AddMinutes(durationMinutes);
        var nowUtc = DateTime.UtcNow;

        var sb = new StringBuilder();
        AppendCrlf(sb, "BEGIN:VCALENDAR");
        AppendCrlf(sb, "VERSION:2.0");
        AppendCrlf(sb, "PRODID:-//EduKey360//Interview Scheduler//EN");
        AppendCrlf(sb, "CALSCALE:GREGORIAN");
        AppendCrlf(sb, $"METHOD:{method}");
        AppendCrlf(sb, "BEGIN:VEVENT");
        AppendCrlf(sb, $"UID:{eventId}@edukey360.com");
        AppendCrlf(sb, $"DTSTAMP:{nowUtc:yyyyMMddTHHmmssZ}");
        AppendCrlf(sb, $"DTSTART:{startDateTimeUtc:yyyyMMddTHHmmssZ}");
        AppendCrlf(sb, $"DTEND:{endDateTimeUtc:yyyyMMddTHHmmssZ}");
        AppendCrlf(sb, $"SUMMARY:{EscapeIcsText(title)}");
        AppendCrlf(sb, $"DESCRIPTION:{EscapeIcsText(description)}");
        AppendCrlf(sb, $"LOCATION:{EscapeIcsText(locationOrLink)}");
        AppendCrlf(sb, $"ORGANIZER;CN={EscapeIcsText(organizerName)}:mailto:{organizerEmail}");
        AppendCrlf(sb, "STATUS:CONFIRMED");
        AppendCrlf(sb, "TRANSP:OPAQUE");
        AppendCrlf(sb, "SEQUENCE:0");
        AppendCrlf(sb, "END:VEVENT");
        AppendCrlf(sb, "END:VCALENDAR");

        return sb.ToString();
    }

    private static void AppendCrlf(StringBuilder sb, string line)
    {
        sb.Append(line).Append("\r\n");
    }

    private static string EscapeIcsText(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return input
            .Replace("\\", "\\\\")
            .Replace(";", "\\;")
            .Replace(",", "\\,")
            .Replace("\r\n", "\\n")
            .Replace("\n", "\\n");
    }
}
