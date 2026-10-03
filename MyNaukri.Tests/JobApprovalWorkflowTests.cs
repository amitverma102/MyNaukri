using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.InstituteAdmin;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Services;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using Xunit;

namespace MyNaukri.Tests;

public class JobApprovalWorkflowTests
{
    private DbContextOptions<ApplicationDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    [Fact]
    public async Task CreateJob_WhenApprovalRequired_SetsPendingAndInactive()
    {
        var options = CreateInMemoryOptions(nameof(CreateJob_WhenApprovalRequired_SetsPendingAndInactive));
        using var context = new ApplicationDbContext(options);

        var institution = new Institution
        {
            Name = "Delhi Public School",
            Code = "DPS01",
            RequireJobApproval = true
        };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var recruiterUser = new User
        {
            Email = "recruiter@dps.com",
            FirstName = "Rajesh",
            LastName = "Sharma",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.Add(recruiterUser);
        await context.SaveChangesAsync();

        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            InstitutionId = institution.Id,
            Credits = 100
        };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var mockAi = new Mock<IAiService>();
        var mockSearch = new Mock<ISearchService>();
        var mockCredit = new Mock<ICreditService>();
        mockCredit.Setup(c => c.GetRatesAsync(recruiter.Id))
            .ReturnsAsync(new RecruiterCreditRate { NormalJobPostingRate = 20, PlatinumJobPostingRate = 40 });
        mockCredit.Setup(c => c.GetBalanceAsync(recruiter.Id))
            .ReturnsAsync(100);
        mockCredit.Setup(c => c.HasSufficientCreditsAsync(recruiter.Id, It.IsAny<int>()))
            .ReturnsAsync(true);
        mockCredit.Setup(c => c.DeductCreditsAsync(recruiter.Id, It.IsAny<int>(), It.IsAny<TransactionType>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()))
            .ReturnsAsync(true);

        var controller = new JobsController(context, mockAi.Object, mockSearch.Object, mockCredit.Object);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, recruiterUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "Recruiter")
        }, "mockAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } };

        var newJobDto = new JobDto
        {
            Title = "Senior PGT Physics",
            Description = "Teach class 11 and 12 physics",
            Requirements = "M.Sc Physics, B.Ed",
            JobType = JobType.FullTime,
            Location = "New Delhi",
            IsPlatinum = false
        };

        var result = await controller.CreateJob(newJobDto);
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var returnedJob = Assert.IsType<JobDto>(createdResult.Value);

        Assert.Equal("Pending", returnedJob.ApprovalStatus);
        Assert.False(returnedJob.IsActive);

        var savedJob = await context.Jobs.FirstOrDefaultAsync(j => j.Title == "Senior PGT Physics");
        Assert.NotNull(savedJob);
        Assert.Equal(JobApprovalStatus.Pending, savedJob.ApprovalStatus);
        Assert.False(savedJob.IsActive);
    }

    [Fact]
    public async Task CreateJob_WhenApprovalDisabled_SetsApprovedAndActive()
    {
        var options = CreateInMemoryOptions(nameof(CreateJob_WhenApprovalDisabled_SetsApprovedAndActive));
        using var context = new ApplicationDbContext(options);

        var institution = new Institution
        {
            Name = "St Xavier High School",
            Code = "STX01",
            RequireJobApproval = false // Disabled
        };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var recruiterUser = new User
        {
            Email = "recruiter@stx.com",
            FirstName = "Anita",
            LastName = "Desai",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.Add(recruiterUser);
        await context.SaveChangesAsync();

        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            InstitutionId = institution.Id,
            Credits = 100
        };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var mockAi = new Mock<IAiService>();
        var mockSearch = new Mock<ISearchService>();
        var mockCredit = new Mock<ICreditService>();
        mockCredit.Setup(c => c.GetRatesAsync(recruiter.Id))
            .ReturnsAsync(new RecruiterCreditRate { NormalJobPostingRate = 20, PlatinumJobPostingRate = 40 });
        mockCredit.Setup(c => c.GetBalanceAsync(recruiter.Id))
            .ReturnsAsync(100);
        mockCredit.Setup(c => c.HasSufficientCreditsAsync(recruiter.Id, It.IsAny<int>()))
            .ReturnsAsync(true);
        mockCredit.Setup(c => c.DeductCreditsAsync(recruiter.Id, It.IsAny<int>(), It.IsAny<TransactionType>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()))
            .ReturnsAsync(true);

        var controller = new JobsController(context, mockAi.Object, mockSearch.Object, mockCredit.Object);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, recruiterUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "Recruiter")
        }, "mockAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } };

        var newJobDto = new JobDto
        {
            Title = "TGT Mathematics",
            Description = "Teach classes 6 to 10",
            Requirements = "B.Sc Math, B.Ed",
            JobType = JobType.FullTime,
            Location = "Mumbai",
            IsPlatinum = false
        };

        var result = await controller.CreateJob(newJobDto);
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var returnedJob = Assert.IsType<JobDto>(createdResult.Value);

        Assert.Equal("Approved", returnedJob.ApprovalStatus);
        Assert.True(returnedJob.IsActive);
    }

    [Fact]
    public async Task InstituteAdmin_CanToggleApprovalSettings()
    {
        var options = CreateInMemoryOptions(nameof(InstituteAdmin_CanToggleApprovalSettings));
        using var context = new ApplicationDbContext(options);

        var institution = new Institution
        {
            Name = "Cambridge International",
            Code = "CIS01",
            RequireJobApproval = true
        };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var adminUser = new User
        {
            Email = "admin@cambridge.com",
            FirstName = "Principal",
            LastName = "Admin",
            Role = Role.InstituteAdministrator,
            IsActive = true
        };
        context.Users.Add(adminUser);
        await context.SaveChangesAsync();

        var adminProfile = new InstituteAdminProfile
        {
            UserId = adminUser.Id,
            InstitutionId = institution.Id
        };
        context.InstituteAdminProfiles.Add(adminProfile);
        await context.SaveChangesAsync();

        var controller = new InstituteAdminController(
            context,
            new Mock<IInstitutionCreditService>().Object,
            new Mock<ICreditLedgerService>().Object,
            new Mock<IRazorpayService>().Object,
            new Mock<IStorageService>().Object,
            new Mock<ICreditService>().Object
        );
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, adminUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "InstituteAdministrator")
        }, "mockAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } };

        // 1. Get settings
        var getResult = await controller.GetApprovalSettings();
        var okGet = Assert.IsType<OkObjectResult>(getResult);
        var settings = Assert.IsType<ApprovalSettingsDto>(okGet.Value);
        Assert.True(settings.RequireJobApproval);

        // 2. Disable approval requirement
        var updateResult = await controller.UpdateApprovalSettings(new ApprovalSettingsDto { RequireJobApproval = false });
        Assert.IsType<OkObjectResult>(updateResult);

        var refreshedInst = await context.Institutions.FindAsync(institution.Id);
        Assert.False(refreshedInst!.RequireJobApproval);
    }

    [Fact]
    public async Task InstituteAdmin_CanApproveJob_WithOptionalComment()
    {
        var options = CreateInMemoryOptions(nameof(InstituteAdmin_CanApproveJob_WithOptionalComment));
        using var context = new ApplicationDbContext(options);

        var institution = new Institution
        {
            Name = "Global Academy",
            Code = "GA01",
            RequireJobApproval = true
        };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var adminUser = new User
        {
            Email = "admin@ga.com",
            FirstName = "Admin",
            LastName = "Global",
            Role = Role.InstituteAdministrator,
            IsActive = true
        };
        var recruiterUser = new User
        {
            Email = "recruiter@ga.com",
            FirstName = "Pooja",
            LastName = "Nair",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.AddRange(adminUser, recruiterUser);
        await context.SaveChangesAsync();

        var adminProfile = new InstituteAdminProfile
        {
            UserId = adminUser.Id,
            InstitutionId = institution.Id
        };
        context.InstituteAdminProfiles.Add(adminProfile);

        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            InstitutionId = institution.Id,
            Credits = 50
        };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var pendingJob = new Job
        {
            Title = "Biology Teacher",
            Description = "Class 10 Biology",
            Requirements = "B.Sc Biology",
            JobType = JobType.FullTime,
            Location = "Bangalore",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            IsActive = false,
            ApprovalStatus = JobApprovalStatus.Pending
        };
        context.Jobs.Add(pendingJob);
        await context.SaveChangesAsync();

        var controller = new InstituteAdminController(
            context,
            new Mock<IInstitutionCreditService>().Object,
            new Mock<ICreditLedgerService>().Object,
            new Mock<IRazorpayService>().Object,
            new Mock<IStorageService>().Object,
            new Mock<ICreditService>().Object
        );
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, adminUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "InstituteAdministrator")
        }, "mockAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } };

        // Test Approvals list
        var listResult = await controller.GetJobsForApproval("pending", null);
        var okList = Assert.IsType<OkObjectResult>(listResult);
        var listData = Assert.IsType<InstitutionJobApprovalsResponseDto>(okList.Value);
        Assert.Equal(1, listData.PendingCount);
        Assert.Single(listData.Jobs);
        Assert.Equal("Pooja Nair", listData.Jobs[0].RecruiterName);

        // Approve Job
        var approveResult = await controller.ApproveJob(pendingJob.Id, new JobApprovalDecisionDto { Comment = "Looks good, approved!" });
        Assert.IsType<OkObjectResult>(approveResult);

        var refreshedJob = await context.Jobs.FindAsync(pendingJob.Id);
        Assert.NotNull(refreshedJob);
        Assert.Equal(JobApprovalStatus.Approved, refreshedJob.ApprovalStatus);
        Assert.True(refreshedJob.IsActive);
        Assert.NotNull(refreshedJob.ApprovedAt);
        Assert.Equal(adminUser.Id, refreshedJob.ApprovedByUserId);
        Assert.Equal("Looks good, approved!", refreshedJob.ApprovalComment);
    }

    [Fact]
    public async Task InstituteAdmin_CanRejectJob_AndRefundsCredits()
    {
        var options = CreateInMemoryOptions(nameof(InstituteAdmin_CanRejectJob_AndRefundsCredits));
        using var context = new ApplicationDbContext(options);

        var institution = new Institution
        {
            Name = "National Public School",
            Code = "NPS01",
            RequireJobApproval = true
        };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var adminUser = new User
        {
            Email = "admin@nps.com",
            FirstName = "Principal",
            LastName = "NPS",
            Role = Role.InstituteAdministrator,
            IsActive = true
        };
        var recruiterUser = new User
        {
            Email = "recruiter@nps.com",
            FirstName = "Kiran",
            LastName = "Rao",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.AddRange(adminUser, recruiterUser);
        await context.SaveChangesAsync();

        var adminProfile = new InstituteAdminProfile
        {
            UserId = adminUser.Id,
            InstitutionId = institution.Id
        };
        context.InstituteAdminProfiles.Add(adminProfile);

        var recruiter = new Recruiter
        {
            UserId = recruiterUser.Id,
            InstitutionId = institution.Id,
            Credits = 50
        };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var pendingJob = new Job
        {
            Title = "History Teacher",
            Description = "Teaching middle school history",
            Requirements = "B.A History",
            JobType = JobType.FullTime,
            Location = "Hyderabad",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            IsActive = false,
            IsPlatinum = false,
            ApprovalStatus = JobApprovalStatus.Pending
        };
        context.Jobs.Add(pendingJob);
        await context.SaveChangesAsync();

        var mockCredit = new Mock<ICreditService>();
        mockCredit.Setup(c => c.GetRatesAsync(recruiter.Id))
            .ReturnsAsync(new RecruiterCreditRate { NormalJobPostingRate = 20, PlatinumJobPostingRate = 40 });
        mockCredit.Setup(c => c.AddCreditsAsync(recruiter.Id, 20, TransactionType.CreditRefund, pendingJob.Id.ToString(), It.IsAny<string>(), adminUser.Id))
            .ReturnsAsync(true);

        var controller = new InstituteAdminController(
            context,
            new Mock<IInstitutionCreditService>().Object,
            new Mock<ICreditLedgerService>().Object,
            new Mock<IRazorpayService>().Object,
            new Mock<IStorageService>().Object,
            mockCredit.Object
        );
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, adminUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "InstituteAdministrator")
        }, "mockAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } };

        // Reject Job
        var rejectResult = await controller.RejectJob(pendingJob.Id, new JobApprovalDecisionDto { Comment = "Salary range is missing and job description is incomplete." });
        Assert.IsType<OkObjectResult>(rejectResult);

        var refreshedJob = await context.Jobs.FindAsync(pendingJob.Id);
        Assert.NotNull(refreshedJob);
        Assert.Equal(JobApprovalStatus.Rejected, refreshedJob.ApprovalStatus);
        Assert.False(refreshedJob.IsActive);
        Assert.NotNull(refreshedJob.ApprovedAt);
        Assert.Equal("Salary range is missing and job description is incomplete.", refreshedJob.ApprovalComment);

        // Verify credit refund was called with 20 credits and CreditRefund type
        mockCredit.Verify(c => c.AddCreditsAsync(
            recruiter.Id,
            20,
            TransactionType.CreditRefund,
            pendingJob.Id.ToString(),
            It.Is<string>(s => s.Contains("Credit refund for rejected job") && s.Contains("Salary range is missing")),
            adminUser.Id
        ), Times.Once);
    }
}
