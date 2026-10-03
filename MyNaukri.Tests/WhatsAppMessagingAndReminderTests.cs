using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using MyNaukri.Infrastructure.Services.WhatsApp;
using Xunit;

namespace MyNaukri.Tests;

public class WhatsAppMessagingAndReminderTests
{
    [Theory]
    [InlineData("9876543210", "919876543210")]
    [InlineData("+91 98765 43210", "919876543210")]
    [InlineData("+91-98765-43210", "919876543210")]
    [InlineData("919876543210", "919876543210")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void CleanPhoneNumber_NormalizesCorrectly(string? input, string expected)
    {
        var result = WhatsAppNotificationService.CleanPhoneNumber(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void WebhookVerification_ValidToken_ReturnsChallenge()
    {
        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        var settings = Options.Create(new WhatsAppSettings { VerifyToken = "test_secret_token_123" });
        var config = new ConfigurationBuilder().Build();
        var logger = NullLogger<WhatsAppWebhookController>.Instance;

        var controller = new WhatsAppWebhookController(mockWhatsApp.Object, settings, config, logger);

        var result = controller.VerifyWebhook("subscribe", "test_secret_token_123", "meta_challenge_xyz");

        var contentResult = Assert.IsType<ContentResult>(result);
        Assert.Equal("meta_challenge_xyz", contentResult.Content);
        Assert.Equal("text/plain", contentResult.ContentType);
    }

    [Fact]
    public void WebhookVerification_InvalidToken_ReturnsForbid()
    {
        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        var settings = Options.Create(new WhatsAppSettings { VerifyToken = "correct_secret" });
        var config = new ConfigurationBuilder().Build();
        var logger = NullLogger<WhatsAppWebhookController>.Instance;

        var controller = new WhatsAppWebhookController(mockWhatsApp.Object, settings, config, logger);

        var result = controller.VerifyWebhook("subscribe", "wrong_token", "challenge_abc");

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task ReceiveWebhook_ReturnsOkFast()
    {
        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        var settings = Options.Create(new WhatsAppSettings());
        var config = new ConfigurationBuilder().Build();
        var logger = NullLogger<WhatsAppWebhookController>.Instance;

        var controller = new WhatsAppWebhookController(mockWhatsApp.Object, settings, config, logger);

        using var doc = JsonDocument.Parse("{\"object\":\"whatsapp_business_account\",\"entry\":[]}");
        var result = await controller.ReceiveWebhook(doc.RootElement);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task SendTestMessage_DispatchesViaService()
    {
        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        mockWhatsApp.Setup(s => s.SendTextMessageAsync(It.IsAny<string>(), It.IsAny<string>(), "TestMessage"))
                    .ReturnsAsync(true);

        var settings = Options.Create(new WhatsAppSettings());
        var config = new ConfigurationBuilder().Build();
        var logger = NullLogger<WhatsAppWebhookController>.Instance;

        var controller = new WhatsAppWebhookController(mockWhatsApp.Object, settings, config, logger);

        var response = await controller.SendTestMessage(new SendTestWhatsAppRequest
        {
            Phone = "9876543210",
            Message = "Hello from test suite"
        });

        var okResult = Assert.IsType<OkObjectResult>(response);
        Assert.NotNull(okResult.Value);
        mockWhatsApp.Verify(s => s.SendTextMessageAsync("9876543210", "Hello from test suite", "TestMessage"), Times.Once);
    }

    [Fact]
    public async Task WhatsAppNotificationService_SimulatedMode_BuffersSentMessages()
    {
        var httpClient = new HttpClient();
        var settings = Options.Create(new WhatsAppSettings
        {
            AccessToken = "", // Empty to trigger simulation mode
            PhoneNumberId = "",
            BaseUrl = "https://edukey360.com"
        });
        var config = new ConfigurationBuilder().Build();
        var logger = NullLogger<WhatsAppNotificationService>.Instance;

        var service = new WhatsAppNotificationService(httpClient, settings, config, logger);

        var success = await service.SendTextMessageAsync("9876543210", "Hello Candidate! Welcome to EduKey360.", "CandidateWelcome");

        Assert.True(success);
        var recent = service.GetRecentMessages();
        Assert.NotEmpty(recent);
        Assert.Contains(recent, m => m.RecipientPhone == "919876543210" && m.MessageType == "CandidateWelcome");
    }

    [Fact]
    public async Task ApplyToJob_DispatchesWhatsAppToCandidateAndRecruiter()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "WhatsAppApplyTestDb_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);

        var recruiterUser = new User
        {
            Email = "recruiter@school.com",
            FirstName = "Rajesh",
            LastName = "Sharma",
            Role = Role.Recruiter
        };
        var institution = new Institution
        {
            Name = "Delhi Public School",
            Code = "DPS01"
        };
        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            User = recruiterUser,
            InstitutionId = institution.Id,
            Institution = institution,
            Mobile = "9811122233"
        };
        var job = new Job
        {
            Title = "Senior PGT Physics",
            InstitutionId = institution.Id,
            Institution = institution,
            RecruiterId = recruiter.Id,
            Recruiter = recruiter,
            IsActive = true
        };

        var candidateUser = new User
        {
            Email = "amit.candidate@test.com",
            FirstName = "Amit",
            LastName = "Verma",
            Role = Role.Candidate
        };
        var candidate = new Candidate
        {
            UserId = candidateUser.Id,
            User = candidateUser,
            PhoneNumber = "9876543210"
        };

        context.Users.AddRange(recruiterUser, candidateUser);
        context.Institutions.Add(institution);
        context.Recruiters.Add(recruiter);
        context.Jobs.Add(job);
        context.Candidates.Add(candidate);
        await context.SaveChangesAsync();

        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        mockWhatsApp.Setup(w => w.SendJobApplicationSubmittedAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()))
                    .ReturnsAsync(true);
        mockWhatsApp.Setup(w => w.SendNewApplicationRecruiterAlertAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()))
                    .ReturnsAsync(true);

        var controller = new JobApplicationsController(
            context,
            new CalendarInviteService(),
            new Mock<IPushNotificationService>().Object,
            new Mock<INotificationService>().Object,
            new Mock<IAiService>().Object,
            new Mock<IStorageService>().Object,
            mockWhatsApp.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, candidateUser.Id.ToString()),
                    new Claim(ClaimTypes.Role, "Candidate")
                }, "TestAuth"))
            }
        };

        var result = await controller.ApplyToJob(job.Id, new JobApplicationsController.ApplyJobRequest
        {
            CoverLetter = "Passionate educator applying for Physics."
        });

        Assert.IsType<OkObjectResult>(result);

        // Verify candidate WhatsApp notification
        mockWhatsApp.Verify(w => w.SendJobApplicationSubmittedAsync(
            "9876543210",
            "Amit Verma",
            "Senior PGT Physics",
            "Delhi Public School",
            It.IsAny<Guid>()), Times.Once);

        // Verify recruiter WhatsApp alert
        mockWhatsApp.Verify(w => w.SendNewApplicationRecruiterAlertAsync(
            "9811122233",
            "Rajesh Sharma",
            "Amit Verma",
            "Senior PGT Physics",
            "Delhi Public School",
            It.IsAny<Guid>()), Times.Once);
    }

    [Fact]
    public async Task UpdateApplicationStatus_DispatchesWhatsAppToCandidate()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "WhatsAppStatusUpdateTestDb_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);

        var recruiterUser = new User
        {
            Email = "recruiter@school.com",
            FirstName = "Pooja",
            LastName = "Kapoor",
            Role = Role.Recruiter
        };
        var institution = new Institution { Name = "St. Marks School" };
        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            User = recruiterUser,
            InstitutionId = institution.Id,
            Institution = institution,
            Mobile = "9822233344"
        };
        var job = new Job
        {
            Title = "Mathematics HOD",
            InstitutionId = institution.Id,
            Institution = institution,
            RecruiterId = recruiter.Id,
            Recruiter = recruiter,
            IsActive = true
        };
        var candidateUser = new User
        {
            Email = "neha@test.com",
            FirstName = "Neha",
            LastName = "Singh",
            Role = Role.Candidate
        };
        var candidate = new Candidate
        {
            UserId = candidateUser.Id,
            User = candidateUser,
            PhoneNumber = "9988776655"
        };
        var application = new JobApplication
        {
            JobId = job.Id,
            Job = job,
            CandidateId = candidate.Id,
            Candidate = candidate,
            Status = ApplicationStatus.UnderReview
        };

        context.Users.AddRange(recruiterUser, candidateUser);
        context.Institutions.Add(institution);
        context.Recruiters.Add(recruiter);
        context.Jobs.Add(job);
        context.Candidates.Add(candidate);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        mockWhatsApp.Setup(w => w.SendApplicationStatusUpdateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>()))
                    .ReturnsAsync(true);

        var controller = new JobApplicationsController(
            context,
            new CalendarInviteService(),
            new Mock<IPushNotificationService>().Object,
            new Mock<INotificationService>().Object,
            new Mock<IAiService>().Object,
            new Mock<IStorageService>().Object,
            mockWhatsApp.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, recruiterUser.Id.ToString()),
                    new Claim(ClaimTypes.Role, "Recruiter")
                }, "TestAuth"))
            }
        };

        var result = await controller.UpdateApplicationStatus(application.Id, new JobApplicationsController.UpdateStatusRequest
        {
            Status = ApplicationStatus.Shortlisted,
            Note = "Profile matches requirements excellently. Shortlisted for interview."
        });

        Assert.IsType<NoContentResult>(result);

        // Verify status update WhatsApp message dispatched to candidate
        mockWhatsApp.Verify(w => w.SendApplicationStatusUpdateAsync(
            "9988776655",
            "Neha Singh",
            "Mathematics HOD",
            "St. Marks School",
            "Shortlisted",
            "Profile matches requirements excellently. Shortlisted for interview."), Times.Once);
    }

    [Fact]
    public async Task ScheduleInterview_DispatchesWhatsAppAndResetsReminderFlag()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "WhatsAppScheduleTestDb_" + Guid.NewGuid())
            .Options;

        using var context = new ApplicationDbContext(options);

        var recruiterUser = new User
        {
            Email = "recruiter@school.com",
            FirstName = "Sunil",
            LastName = "Rathore",
            Role = Role.Recruiter
        };
        var institution = new Institution { Name = "Ryan International" };
        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            User = recruiterUser,
            InstitutionId = institution.Id,
            Institution = institution,
            Mobile = "9899988877"
        };
        var job = new Job
        {
            Title = "English Teacher",
            InstitutionId = institution.Id,
            Institution = institution,
            RecruiterId = recruiter.Id,
            Recruiter = recruiter,
            IsActive = true
        };
        var candidateUser = new User
        {
            Email = "kavita@test.com",
            FirstName = "Kavita",
            LastName = "Iyer",
            Role = Role.Candidate
        };
        var candidate = new Candidate
        {
            UserId = candidateUser.Id,
            User = candidateUser,
            PhoneNumber = "9711223344"
        };
        var application = new JobApplication
        {
            JobId = job.Id,
            Job = job,
            CandidateId = candidate.Id,
            Candidate = candidate,
            Status = ApplicationStatus.Shortlisted,
            IsInterviewReminderSent = true // previously marked sent, should be reset
        };

        context.Users.AddRange(recruiterUser, candidateUser);
        context.Institutions.Add(institution);
        context.Recruiters.Add(recruiter);
        context.Jobs.Add(job);
        context.Candidates.Add(candidate);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        mockWhatsApp.Setup(w => w.SendInterviewScheduledCandidateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<string?>()))
                    .ReturnsAsync(true);
        mockWhatsApp.Setup(w => w.SendInterviewScheduledRecruiterAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                    .ReturnsAsync(true);

        var controller = new JobApplicationsController(
            context,
            new CalendarInviteService(),
            new Mock<IPushNotificationService>().Object,
            new Mock<INotificationService>().Object,
            new Mock<IAiService>().Object,
            new Mock<IStorageService>().Object,
            mockWhatsApp.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, recruiterUser.Id.ToString()),
                    new Claim(ClaimTypes.Role, "Recruiter")
                }, "TestAuth"))
            }
        };

        var interviewTime = DateTime.UtcNow.AddDays(2);
        var result = await controller.ScheduleInterview(application.Id, new JobApplicationsController.ScheduleInterviewRequest
        {
            InterviewDate = interviewTime,
            InterviewMode = InterviewMode.Online,
            InterviewLink = "https://meet.google.com/xyz-uvw"
        });

        Assert.IsType<NoContentResult>(result);

        // Verify reminder flag was reset to false
        var updatedApp = await context.JobApplications.FindAsync(application.Id);
        Assert.NotNull(updatedApp);
        Assert.False(updatedApp.IsInterviewReminderSent);
        Assert.Null(updatedApp.InterviewReminderSentAt);
        Assert.Equal(ApplicationStatus.InterviewScheduled, updatedApp.Status);

        // Verify WhatsApp messages sent to both candidate and recruiter
        mockWhatsApp.Verify(w => w.SendInterviewScheduledCandidateAsync(
            "9711223344",
            "Kavita Iyer",
            "English Teacher",
            "Ryan International",
            interviewTime,
            "Online",
            "https://meet.google.com/xyz-uvw",
            false,
            null), Times.Once);

        mockWhatsApp.Verify(w => w.SendInterviewScheduledRecruiterAsync(
            "9899988877",
            "Sunil Rathore",
            "Kavita Iyer",
            "English Teacher",
            interviewTime,
            "Online",
            "https://meet.google.com/xyz-uvw",
            false), Times.Once);
    }

    [Fact]
    public async Task InterviewReminderBackgroundService_ProcessUpcomingInterviews_Sends30MinReminder()
    {
        var dbName = "ReminderServiceTestDb_" + Guid.NewGuid();
        var services = new ServiceCollection();

        services.AddDbContext<ApplicationDbContext>(opt => opt.UseInMemoryDatabase(dbName));

        var mockWhatsApp = new Mock<IWhatsAppNotificationService>();
        mockWhatsApp.Setup(w => w.SendInterview30MinReminderCandidateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>()))
                    .ReturnsAsync(true);
        mockWhatsApp.Setup(w => w.SendInterview30MinReminderRecruiterAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>()))
                    .ReturnsAsync(true);

        var mockPush = new Mock<IPushNotificationService>();
        mockPush.Setup(p => p.SendPushNotificationAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

        services.AddSingleton(mockWhatsApp.Object);
        services.AddSingleton(mockPush.Object);

        var serviceProvider = services.BuildServiceProvider();

        // Seed an interview scheduled 30 minutes from now (inside the 20-40 min window)
        using (var scope = serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var recruiterUser = new User
            {
                Email = "recruiter@school.com",
                FirstName = "Deepak",
                LastName = "Chawla",
                Role = Role.Recruiter
            };
            var institution = new Institution { Name = "Modern School" };
            var recruiter = new Recruiter
            {
                UserId = recruiterUser.Id,
                User = recruiterUser,
                InstitutionId = institution.Id,
                Institution = institution,
                Mobile = "9810011223"
            };
            var job = new Job
            {
                Title = "Computer Science Teacher",
                InstitutionId = institution.Id,
                Institution = institution,
                RecruiterId = recruiter.Id,
                Recruiter = recruiter,
                IsActive = true
            };
            var candidateUser = new User
            {
                Email = "candidate@test.com",
                FirstName = "Rahul",
                LastName = "Mehra",
                Role = Role.Candidate
            };
            var candidate = new Candidate
            {
                UserId = candidateUser.Id,
                User = candidateUser,
                PhoneNumber = "9823456789"
            };

            var appDueReminder = new JobApplication
            {
                JobId = job.Id,
                Job = job,
                CandidateId = candidate.Id,
                Candidate = candidate,
                Status = ApplicationStatus.InterviewScheduled,
                InterviewDate = DateTime.UtcNow.AddMinutes(30), // 30 min from now
                InterviewMode = InterviewMode.Online,
                InterviewLink = "https://teams.microsoft.com/meet/123",
                IsInterviewReminderSent = false
            };

            // Another application scheduled 3 hours away (outside window)
            var appFarAway = new JobApplication
            {
                JobId = job.Id,
                Job = job,
                CandidateId = candidate.Id,
                Candidate = candidate,
                Status = ApplicationStatus.InterviewScheduled,
                InterviewDate = DateTime.UtcNow.AddHours(3),
                InterviewMode = InterviewMode.Online,
                IsInterviewReminderSent = false
            };

            db.Users.AddRange(recruiterUser, candidateUser);
            db.Institutions.Add(institution);
            db.Recruiters.Add(recruiter);
            db.Jobs.Add(job);
            db.Candidates.Add(candidate);
            db.JobApplications.AddRange(appDueReminder, appFarAway);
            await db.SaveChangesAsync();
        }

        var backgroundService = new InterviewReminderBackgroundService(
            serviceProvider,
            NullLogger<InterviewReminderBackgroundService>.Instance);

        // First pass: Should process the 30-min interview
        var count = await backgroundService.ProcessUpcomingInterviewsAsync(CancellationToken.None);
        Assert.Equal(1, count);

        // Verify Candidate WhatsApp 30-min reminder sent
        mockWhatsApp.Verify(w => w.SendInterview30MinReminderCandidateAsync(
            "9823456789",
            "Rahul Mehra",
            "Computer Science Teacher",
            "Modern School",
            It.IsAny<DateTime>(),
            "Online",
            "https://teams.microsoft.com/meet/123"), Times.Once);

        // Verify Recruiter WhatsApp 30-min reminder sent
        mockWhatsApp.Verify(w => w.SendInterview30MinReminderRecruiterAsync(
            "9810011223",
            "Deepak Chawla",
            "Rahul Mehra",
            "Computer Science Teacher",
            It.IsAny<DateTime>(),
            "Online",
            "https://teams.microsoft.com/meet/123"), Times.Once);

        // Verify Expo Push Notification sent to candidate
        mockPush.Verify(p => p.SendPushNotificationAsync(
            It.IsAny<Guid>(),
            It.Is<string>(t => t.Contains("30 Minutes")),
            It.Is<string>(b => b.Contains("Computer Science Teacher"))), Times.Once);

        // Verify application state is marked as reminder sent
        using (var scope = serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var apps = await db.JobApplications.ToListAsync();
            var appProcessed = apps.First(a => a.InterviewDate <= DateTime.UtcNow.AddMinutes(40));
            Assert.True(appProcessed.IsInterviewReminderSent);
            Assert.NotNull(appProcessed.InterviewReminderSentAt);

            var appUnprocessed = apps.First(a => a.InterviewDate > DateTime.UtcNow.AddMinutes(40));
            Assert.False(appUnprocessed.IsInterviewReminderSent);
        }

        // Second pass: Should NOT send duplicate reminders
        var secondPassCount = await backgroundService.ProcessUpcomingInterviewsAsync(CancellationToken.None);
        Assert.Equal(0, secondPassCount);

        // WhatsApp call counts remain 1 (no duplicates)
        mockWhatsApp.Verify(w => w.SendInterview30MinReminderCandidateAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }
}
