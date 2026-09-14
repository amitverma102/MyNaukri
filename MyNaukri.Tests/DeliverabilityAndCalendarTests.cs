using System;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using MyNaukri.Infrastructure.Services.Email;
using Xunit;

namespace MyNaukri.Tests;

public class DeliverabilityAndCalendarTests
{
    [Fact]
    public void CalendarInviteService_GeneratesValidRfc5545WithCrlfEndings()
    {
        var service = new CalendarInviteService();
        var startDate = new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc);
        
        var ics = service.GenerateIcsContent(
            eventId: "test-event-123",
            title: "Physics Teacher Interview, Delhi Campus",
            description: "Interview notes; bring demo lesson portfolio\nOnline link: https://meet.example.com",
            locationOrLink: "https://meet.example.com",
            startDateTimeUtc: startDate,
            durationMinutes: 45,
            organizerEmail: "interviews@edukey360.com",
            organizerName: "EduKey360 Recruiter",
            method: "PUBLISH"
        );

        Assert.Contains("BEGIN:VCALENDAR\r\n", ics);
        Assert.Contains("VERSION:2.0\r\n", ics);
        Assert.Contains("METHOD:PUBLISH\r\n", ics);
        Assert.Contains("UID:test-event-123@edukey360.com\r\n", ics);
        Assert.Contains("DTSTART:20260915T100000Z\r\n", ics);
        Assert.Contains("DTEND:20260915T104500Z\r\n", ics);
        Assert.Contains("SUMMARY:Physics Teacher Interview\\, Delhi Campus\r\n", ics);
        Assert.Contains("STATUS:CONFIRMED\r\n", ics);
        Assert.Contains("END:VCALENDAR\r\n", ics);

        // Verify every line break is strict CRLF
        var lines = ics.Split(new[] { "\r\n" }, StringSplitOptions.None);
        Assert.True(lines.Length > 10);
        Assert.DoesNotContain("\n", ics.Replace("\r\n", ""));
    }

    [Fact]
    public void ConvertHtmlToPlainText_StripsStyleBlocksAndDoesNotLeakCss()
    {
        var html = @"
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Inter, sans-serif; background-color: #f8fafc; }
    .btn { background: #0f766e; color: white; padding: 12px; }
  </style>
</head>
<body>
  <h1>Welcome to EduKey360!</h1>
  <p>Your verification code is: <strong>849201</strong>.</p>
  <p>Valid for 15 minutes.</p>
</body>
</html>";

        var plainText = SmtpNotificationService.ConvertHtmlToPlainText(html);

        Assert.DoesNotContain("font-family", plainText);
        Assert.DoesNotContain("background-color", plainText);
        Assert.DoesNotContain(".btn", plainText);
        Assert.Contains("Welcome to EduKey360!", plainText);
        Assert.Contains("Your verification code is: 849201.", plainText);
        Assert.Contains("Valid for 15 minutes.", plainText);
    }

    [Fact]
    public async Task DownloadInterviewCalendar_WhenApplicationScheduled_ReturnsFileResult()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "CalendarTestDb_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "St. Xavier Academy", Code = "SXA-01" };
        var job = new Job { Title = "Senior Math Teacher", InstitutionId = institution.Id, Institution = institution };
        var user = new User { Email = "teacher@example.com", FirstName = "Priya", LastName = "Sharma" };
        var candidate = new Candidate { UserId = user.Id, User = user };

        var application = new JobApplication
        {
            JobId = job.Id,
            Job = job,
            CandidateId = candidate.Id,
            Candidate = candidate,
            InterviewDate = DateTime.UtcNow.AddDays(2),
            InterviewMode = InterviewMode.Online,
            InterviewLink = "https://meet.google.com/abc-def-ghi",
            InterviewDetails = "Please prepare a 10 min lesson on calculus."
        };
        var appId = application.Id;

        context.Institutions.Add(institution);
        context.Jobs.Add(job);
        context.Users.Add(user);
        context.Candidates.Add(candidate);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var calendarService = new CalendarInviteService();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotification = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var controller = new JobApplicationsController(context, calendarService, mockPush.Object, mockNotification.Object, mockAi.Object, mockStorage.Object);

        var result = await controller.DownloadInterviewCalendar(appId);

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/calendar; charset=utf-8", fileResult.ContentType);
        Assert.StartsWith("interview_", fileResult.FileDownloadName);
        Assert.EndsWith(".ics", fileResult.FileDownloadName);

        var content = Encoding.UTF8.GetString(fileResult.FileContents);
        Assert.Contains("BEGIN:VCALENDAR", content);
        Assert.Contains("Senior Math Teacher - St. Xavier Academy", content);
        Assert.Contains("https://meet.google.com/abc-def-ghi", content);
        Assert.Contains("METHOD:PUBLISH", content);
    }

    [Fact]
    public async Task DownloadInterviewCalendar_WhenNotScheduled_ReturnsNotFound()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "CalendarTestDb_NotFound_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);
        var calendarService = new CalendarInviteService();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotification = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var controller = new JobApplicationsController(context, calendarService, mockPush.Object, mockNotification.Object, mockAi.Object, mockStorage.Object);

        var result = await controller.DownloadInterviewCalendar(Guid.NewGuid());
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Interview not found or not yet scheduled.", notFoundResult.Value);
    }

    [Fact]
    public async Task ScheduleInterview_WhenRescheduling_RecordsCommentWithReasonAndUpdatesSchedule()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "ScheduleTestDb_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);

        var recruiterUser = new User { Email = "recruiter@school.com", FirstName = "Rohit", LastName = "Verma" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, User = recruiterUser };
        var institution = new Institution { Name = "Delhi Public School", Code = "DPS-01" };
        var job = new Job { Title = "PGT Physics Teacher", InstitutionId = institution.Id, Institution = institution, RecruiterId = recruiter.Id, Recruiter = recruiter };
        var candidateUser = new User { Email = "candidate@example.com", FirstName = "Aakash", LastName = "Gupta" };
        var candidate = new Candidate { UserId = candidateUser.Id, User = candidateUser };

        var application = new JobApplication
        {
            JobId = job.Id,
            Job = job,
            CandidateId = candidate.Id,
            Candidate = candidate,
            Status = ApplicationStatus.InterviewScheduled,
            InterviewDate = DateTime.UtcNow.AddDays(1),
            InterviewMode = InterviewMode.Online,
            InterviewLink = "https://meet.google.com/old-link",
            InterviewDetails = "Round 1 Demo"
        };

        context.Users.AddRange(recruiterUser, candidateUser);
        context.Recruiters.Add(recruiter);
        context.Institutions.Add(institution);
        context.Jobs.Add(job);
        context.Candidates.Add(candidate);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var calendarService = new CalendarInviteService();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotification = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var controller = new JobApplicationsController(context, calendarService, mockPush.Object, mockNotification.Object, mockAi.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, recruiterUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "Recruiter")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        var newDate = DateTime.UtcNow.AddDays(3);
        var rescheduleRequest = new JobApplicationsController.ScheduleInterviewRequest
        {
            InterviewDate = newDate,
            InterviewMode = InterviewMode.Online,
            InterviewLink = "https://zoom.us/j/999888777",
            InterviewDetails = "Shifted to accommodate academic panel",
            RescheduleReason = "Academic head was traveling"
        };

        var result = await controller.ScheduleInterview(application.Id, rescheduleRequest);
        Assert.IsType<NoContentResult>(result);

        var updatedApp = await context.JobApplications.FindAsync(application.Id);
        Assert.NotNull(updatedApp);
        Assert.Equal(newDate, updatedApp.InterviewDate);
        Assert.Equal("https://zoom.us/j/999888777", updatedApp.InterviewLink);

        var comments = await context.JobApplicationComments.Where(c => c.JobApplicationId == application.Id).ToListAsync();
        Assert.Single(comments);
        Assert.Contains("Interview Rescheduled to", comments[0].Comment);
        Assert.Contains("Academic head was traveling", comments[0].Comment);

        mockPush.Verify(p => p.SendPushNotificationAsync(
            candidateUser.Id,
            "Interview Rescheduled!",
            It.Is<string>(body => body.Contains("rescheduled to"))
        ), Times.Once);
    }

    [Fact]
    public async Task UpdateApplicationStatus_WithComment_PersistsDecisionComment()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "StatusDecisionTestDb_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);

        var recruiterUser = new User { Email = "hr@school.com", FirstName = "Anil", LastName = "Mehta" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, User = recruiterUser };
        var institution = new Institution { Name = "Modern School", Code = "MS-01" };
        var job = new Job { Title = "TGT English", InstitutionId = institution.Id, Institution = institution, RecruiterId = recruiter.Id, Recruiter = recruiter };
        var candidateUser = new User { Email = "sneha@example.com", FirstName = "Sneha", LastName = "Kapoor" };
        var candidate = new Candidate { UserId = candidateUser.Id, User = candidateUser };

        var application = new JobApplication
        {
            JobId = job.Id,
            Job = job,
            CandidateId = candidate.Id,
            Candidate = candidate,
            Status = ApplicationStatus.InterviewScheduled
        };

        context.Users.AddRange(recruiterUser, candidateUser);
        context.Recruiters.Add(recruiter);
        context.Institutions.Add(institution);
        context.Jobs.Add(job);
        context.Candidates.Add(candidate);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var calendarService = new CalendarInviteService();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotification = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var controller = new JobApplicationsController(context, calendarService, mockPush.Object, mockNotification.Object, mockAi.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, recruiterUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "Recruiter")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        var updateRequest = new JobApplicationsController.UpdateStatusRequest
        {
            Status = ApplicationStatus.Offered,
            Note = "Outstanding demo presentation on Shakespearean literature. Selected for Senior Wing."
        };

        var result = await controller.UpdateApplicationStatus(application.Id, updateRequest);
        Assert.IsType<NoContentResult>(result);

        var updatedApp = await context.JobApplications.FindAsync(application.Id);
        Assert.NotNull(updatedApp);
        Assert.Equal(ApplicationStatus.Offered, updatedApp.Status);

        var comments = await context.JobApplicationComments.Where(c => c.JobApplicationId == application.Id).ToListAsync();
        Assert.Single(comments);
        Assert.Equal("[Offered Decision]: Outstanding demo presentation on Shakespearean literature. Selected for Senior Wing.", comments[0].Comment);
    }
}
