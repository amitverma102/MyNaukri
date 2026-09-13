using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class ProfilePictureAndJobApplicationTests
{
    private DbContextOptions<ApplicationDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    private IFormFile CreateMockImageFile(string fileName = "avatar.png", string contentType = "image/png", long size = 1024)
    {
        var stream = new MemoryStream(new byte[size]);
        return new FormFile(stream, 0, size, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    [Fact]
    public async Task AuthController_UploadProfilePicture_UpdatesUserAndCandidate()
    {
        var options = CreateInMemoryOptions("TestDb_ProfilePic_" + Guid.NewGuid());
        using var context = new ApplicationDbContext(options);

        var user = new User
        {
            FirstName = "Alice",
            LastName = "Sharma",
            Email = "alice@example.com",
            Role = Role.Candidate,
            IsActive = true
        };
        var candidate = new Candidate
        {
            UserId = user.Id,
            PhoneNumber = "9876543210"
        };
        context.Users.Add(user);
        context.Candidates.Add(candidate);
        await context.SaveChangesAsync();

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        var mockNotify = new Mock<INotificationService>();
        var mockStorage = new Mock<IStorageService>();
        mockStorage.Setup(s => s.UploadImageAsync(It.IsAny<byte[]>(), It.IsAny<string>(), "profiles"))
            .ReturnsAsync("/uploads/profiles/test-avatar.png");

        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        var file = CreateMockImageFile("test-avatar.png");
        var result = await controller.UploadProfilePicture(file);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var updatedUser = await context.Users.FindAsync(user.Id);
        var updatedCandidate = await context.Candidates.FirstOrDefaultAsync(c => c.UserId == user.Id);
        Assert.Equal("/uploads/profiles/test-avatar.png", updatedUser!.ProfilePictureUrl);
        Assert.Equal("/uploads/profiles/test-avatar.png", updatedCandidate!.ProfilePictureUrl);
    }

    [Fact]
    public async Task JobApplicationsController_ApplyToJob_SavesCoverLetterAndResumeUrl()
    {
        var options = CreateInMemoryOptions("TestDb_ApplyJob_" + Guid.NewGuid());
        using var context = new ApplicationDbContext(options);

        var user = new User
        {
            FirstName = "Rohan",
            LastName = "Verma",
            Email = "rohan@example.com",
            Role = Role.Candidate,
            IsActive = true
        };
        var candidate = new Candidate
        {
            UserId = user.Id,
            ResumeUrl = "/uploads/resumes/default_resume.pdf",
            PhoneNumber = "9988776655"
        };
        var recruiterUser = new User
        {
            FirstName = "Recruiter",
            LastName = "One",
            Email = "recruiter@school.com",
            Role = Role.Recruiter,
            IsActive = true
        };
        var institution = new Institution
        {
            Name = "Delhi Public School",
            Code = "DPS001"
        };
        var recruiter = new Recruiter
        {
            User = recruiterUser,
            Institution = institution
        };
        var job = new Job
        {
            Title = "Senior PGT Physics",
            Recruiter = recruiter,
            Institution = institution,
            IsActive = true
        };

        context.Users.AddRange(user, recruiterUser);
        context.Institutions.Add(institution);
        context.Recruiters.Add(recruiter);
        context.Candidates.Add(candidate);
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var mockCalendar = new Mock<ICalendarInviteService>();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotify = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var controller = new JobApplicationsController(
            context, mockCalendar.Object, mockPush.Object, mockNotify.Object, mockAi.Object, mockStorage.Object);

        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, "Candidate")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        var request = new JobApplicationsController.ApplyJobRequest
        {
            CoverLetter = "I have 8 years of experience teaching CBSE Class 11 and 12 Physics.",
            ResumeUrl = "/uploads/resumes/custom_physics_resume.pdf"
        };

        var result = await controller.ApplyToJob(job.Id, request);
        Assert.IsType<OkObjectResult>(result);

        var savedApp = await context.JobApplications.FirstOrDefaultAsync(a => a.JobId == job.Id && a.CandidateId == candidate.Id);
        Assert.NotNull(savedApp);
        Assert.Equal("I have 8 years of experience teaching CBSE Class 11 and 12 Physics.", savedApp!.CoverLetter);
        Assert.Equal("/uploads/resumes/custom_physics_resume.pdf", savedApp.ResumeUrl);
    }

    [Fact]
    public async Task InstituteAdminController_UploadLogo_UpdatesInstitutionLogoUrl()
    {
        var options = CreateInMemoryOptions("TestDb_InstLogo_" + Guid.NewGuid());
        using var context = new ApplicationDbContext(options);

        var user = new User
        {
            FirstName = "Principal",
            LastName = "Admin",
            Email = "admin@dpsdelhi.edu.in",
            Role = Role.InstituteAdministrator,
            IsActive = true
        };
        var institution = new Institution
        {
            Name = "Delhi Public School R.K. Puram",
            Code = "DPSRKP01",
            Status = InstitutionStatus.Active
        };
        var profile = new InstituteAdminProfile
        {
            UserId = user.Id,
            Institution = institution
        };

        context.Users.Add(user);
        context.Institutions.Add(institution);
        context.InstituteAdminProfiles.Add(profile);
        await context.SaveChangesAsync();

        var mockCreditService = new Mock<IInstitutionCreditService>();
        var mockLedgerService = new Mock<ICreditLedgerService>();
        var mockRazorpay = new Mock<IRazorpayService>();
        var mockStorage = new Mock<IStorageService>();
        mockStorage.Setup(s => s.UploadImageAsync(It.IsAny<byte[]>(), It.IsAny<string>(), "logos"))
            .ReturnsAsync("/uploads/logos/dps-logo.png");

        var controller = new InstituteAdminController(
            context, mockCreditService.Object, mockLedgerService.Object, mockRazorpay.Object, mockStorage.Object);

        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, "InstituteAdministrator")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        var file = CreateMockImageFile("dps-logo.png");
        var result = await controller.UploadInstitutionLogo(file);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var updatedInstitution = await context.Institutions.FindAsync(institution.Id);
        Assert.Equal("/uploads/logos/dps-logo.png", updatedInstitution!.LogoUrl);
    }
}
