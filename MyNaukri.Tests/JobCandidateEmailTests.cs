using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using Xunit;

namespace MyNaukri.Tests;

public class JobCandidateEmailTests
{
    private DbContextOptions<ApplicationDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    private void SetupControllerContext(ControllerBase controller, Guid userId, string role = "Recruiter")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    [Fact]
    public async Task GetCandidateJobEmailCost_CalculatesFullCost_WhenContactAndResumeAreLocked()
    {
        var dbName = "TestDb_EmailCost_Locked_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Greenwood High", City = "Bangalore" };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@greenwood.com", Role = Role.Recruiter, FirstName = "Jane", LastName = "Doe" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Credits = 50 };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "Physics Teacher",
            Description = "Teach physics to high schoolers.",
            Requirements = "M.Sc Physics",
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate@example.com", Role = Role.Candidate, FirstName = "Vikrant", LastName = "Yadav" };
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "+919876543210", ResumeUrl = "/resumes/test.pdf" };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        await context.SaveChangesAsync();

        var aiMock = new Mock<IAiService>();
        var searchMock = new Mock<ISearchService>();
        var creditMock = new Mock<ICreditService>();
        creditMock.Setup(c => c.GetBalanceAsync(recruiter.Id)).ReturnsAsync(50);
        creditMock.Setup(c => c.GetRatesAsync(recruiter.Id)).ReturnsAsync(new RecruiterCreditRate
        {
            CandidateEmailRate = 3,
            ContactViewRate = 2,
            ResumeDownloadRate = 5
        });

        var inMemoryConfig = new Dictionary<string, string?>
        {
            { "CreditSettings:CandidateEmailRate", "3" },
            { "CreditSettings:ContactViewRate", "2" },
            { "CreditSettings:ResumeDownloadRate", "5" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();

        var controller = new JobsController(context, aiMock.Object, searchMock.Object, creditMock.Object, null, config);
        SetupControllerContext(controller, recruiterUser.Id);

        var result = await controller.GetCandidateJobEmailCost(job.Id, candidate.Id);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var costDto = Assert.IsType<CandidateJobEmailCostDto>(okResult.Value);

        Assert.Equal(3, costDto.EmailCost);
        Assert.Equal(2, costDto.ContactUnlockCost);
        Assert.Equal(5, costDto.ResumeUnlockCost);
        Assert.Equal(10, costDto.TotalCost);
        Assert.False(costDto.IsContactUnlocked);
        Assert.False(costDto.IsResumeUnlocked);
        Assert.True(costDto.HasSufficientBalance);
    }

    [Fact]
    public async Task GetCandidateJobEmailCost_DoesNotAddContactOrResumeCost_WhenAlreadyUnlocked()
    {
        var dbName = "TestDb_EmailCost_Unlocked_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Greenwood High", City = "Bangalore" };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@greenwood.com", Role = Role.Recruiter, FirstName = "Jane", LastName = "Doe" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Credits = 50 };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "Physics Teacher",
            Description = "Teach physics to high schoolers.",
            Requirements = "M.Sc Physics",
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate@example.com", Role = Role.Candidate, FirstName = "Vikrant", LastName = "Yadav" };
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "+919876543210", ResumeUrl = "/resumes/test.pdf" };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        // Candidate already has contact and resume unlocked by this recruiter
        var access = new CandidateContactAccess
        {
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            CandidateId = candidate.Id,
            HasUnlockedContact = true,
            HasDownloadedResume = true
        };
        context.CandidateContactAccesses.Add(access);

        await context.SaveChangesAsync();

        var aiMock = new Mock<IAiService>();
        var searchMock = new Mock<ISearchService>();
        var creditMock = new Mock<ICreditService>();
        creditMock.Setup(c => c.GetBalanceAsync(recruiter.Id)).ReturnsAsync(50);
        creditMock.Setup(c => c.GetRatesAsync(recruiter.Id)).ReturnsAsync(new RecruiterCreditRate
        {
            CandidateEmailRate = 3,
            ContactViewRate = 2,
            ResumeDownloadRate = 5
        });

        var controller = new JobsController(context, aiMock.Object, searchMock.Object, creditMock.Object);
        SetupControllerContext(controller, recruiterUser.Id);

        var result = await controller.GetCandidateJobEmailCost(job.Id, candidate.Id);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var costDto = Assert.IsType<CandidateJobEmailCostDto>(okResult.Value);

        Assert.Equal(3, costDto.EmailCost);
        Assert.Equal(0, costDto.ContactUnlockCost);
        Assert.Equal(0, costDto.ResumeUnlockCost);
        Assert.Equal(3, costDto.TotalCost);
        Assert.True(costDto.IsContactUnlocked);
        Assert.True(costDto.IsResumeUnlocked);
        Assert.Equal("candidate@example.com", costDto.RecipientEmail);
    }

    [Fact]
    public async Task SendJobEmailToCandidate_DeductsAllCostsAndUnlocks_WhenContactAndResumeAreLocked()
    {
        var dbName = "TestDb_SendEmail_Locked_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Greenwood High", City = "Bangalore" };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@greenwood.com", Role = Role.Recruiter, FirstName = "Jane", LastName = "Doe" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Credits = 20 };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "Physics Teacher",
            Description = "Teach physics to high schoolers.",
            Requirements = "M.Sc Physics",
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id,
            Location = "Bangalore",
            MinSalary = 500000,
            MaxSalary = 800000
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate@example.com", Role = Role.Candidate, FirstName = "Vikrant", LastName = "Yadav" };
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "+919876543210", ResumeUrl = "/resumes/test.pdf" };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        await context.SaveChangesAsync();

        var aiMock = new Mock<IAiService>();
        var searchMock = new Mock<ISearchService>();
        var creditMock = new Mock<ICreditService>();
        var notifyMock = new Mock<INotificationService>();

        creditMock.Setup(c => c.GetBalanceAsync(recruiter.Id)).ReturnsAsync(20);
        creditMock.Setup(c => c.GetRatesAsync(recruiter.Id)).ReturnsAsync(new RecruiterCreditRate
        {
            CandidateEmailRate = 3,
            ContactViewRate = 2,
            ResumeDownloadRate = 5
        });

        creditMock.Setup(c => c.DeductCreditsAsync(
            recruiter.Id,
            It.IsAny<int>(),
            It.IsAny<TransactionType>(),
            candidate.Id.ToString(),
            It.IsAny<string>(),
            recruiterUser.Id)).ReturnsAsync(true);

        var inMemoryConfig = new Dictionary<string, string?>
        {
            { "CreditSettings:CandidateEmailRate", "3" },
            { "CreditSettings:ContactViewRate", "2" },
            { "CreditSettings:ResumeDownloadRate", "5" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();

        var controller = new JobsController(context, aiMock.Object, searchMock.Object, creditMock.Object, notifyMock.Object, config);
        SetupControllerContext(controller, recruiterUser.Id);

        var sendRequest = new SendJobEmailRequestDto
        {
            CustomMessage = "We were impressed by your background and think you would be a great fit!"
        };

        var response = await controller.SendJobEmailToCandidate(job.Id, candidate.Id, sendRequest);
        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var resultDto = Assert.IsType<SendJobEmailResultDto>(okResult.Value);

        Assert.True(resultDto.Success);
        Assert.Equal(10, resultDto.CreditsDeducted);
        Assert.Equal(3, resultDto.EmailCost);
        Assert.Equal(2, resultDto.ContactUnlockCost);
        Assert.Equal(5, resultDto.ResumeUnlockCost);

        // Verify credit deductions: contact (2), resume (5), email (3)
        creditMock.Verify(c => c.DeductCreditsAsync(recruiter.Id, 2, TransactionType.RecruiterContactView, candidate.Id.ToString(), It.IsAny<string>(), recruiterUser.Id), Times.Once);
        creditMock.Verify(c => c.DeductCreditsAsync(recruiter.Id, 5, TransactionType.RecruiterResumeDownload, candidate.Id.ToString(), It.IsAny<string>(), recruiterUser.Id), Times.Once);
        creditMock.Verify(c => c.DeductCreditsAsync(recruiter.Id, 3, TransactionType.RecruiterCandidateEmail, candidate.Id.ToString(), It.IsAny<string>(), recruiterUser.Id), Times.Once);

        // Verify CandidateContactAccess was created with contact and resume unlocked
        var access = await context.CandidateContactAccesses.FirstOrDefaultAsync(a => a.RecruiterId == recruiter.Id && a.CandidateId == candidate.Id);
        Assert.NotNull(access);
        Assert.True(access.HasUnlockedContact);
        Assert.True(access.HasDownloadedResume);
        Assert.Equal(7, access.CreditsCharged);

        // Verify email was sent with JD content
        notifyMock.Verify(n => n.SendEmailAsync(
            "candidate@example.com",
            It.Is<string>(s => s.Contains("Physics Teacher")),
            It.Is<string>(b => b.Contains("Teach physics to high schoolers.") && b.Contains("M.Sc Physics") && b.Contains("We were impressed by your background")),
            EmailType.JobAlert), Times.Once);
    }

    [Fact]
    public async Task SendJobEmailToCandidate_OnlyChargesEmailCost_WhenCandidateAlreadyUnlocked()
    {
        var dbName = "TestDb_SendEmail_AlreadyUnlocked_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Greenwood High", City = "Bangalore" };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@greenwood.com", Role = Role.Recruiter, FirstName = "Jane", LastName = "Doe" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Credits = 20 };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "Physics Teacher",
            Description = "Teach physics.",
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate@example.com", Role = Role.Candidate, FirstName = "Vikrant", LastName = "Yadav" };
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "+919876543210" };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        // Contact and resume already unlocked
        var existingAccess = new CandidateContactAccess
        {
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            CandidateId = candidate.Id,
            HasUnlockedContact = true,
            HasDownloadedResume = true,
            CreditsCharged = 7
        };
        context.CandidateContactAccesses.Add(existingAccess);

        await context.SaveChangesAsync();

        var aiMock = new Mock<IAiService>();
        var searchMock = new Mock<ISearchService>();
        var creditMock = new Mock<ICreditService>();
        var notifyMock = new Mock<INotificationService>();

        creditMock.Setup(c => c.GetBalanceAsync(recruiter.Id)).ReturnsAsync(20);
        creditMock.Setup(c => c.GetRatesAsync(recruiter.Id)).ReturnsAsync(new RecruiterCreditRate
        {
            CandidateEmailRate = 3,
            ContactViewRate = 2,
            ResumeDownloadRate = 5
        });

        creditMock.Setup(c => c.DeductCreditsAsync(
            recruiter.Id,
            3,
            TransactionType.RecruiterCandidateEmail,
            candidate.Id.ToString(),
            It.IsAny<string>(),
            recruiterUser.Id)).ReturnsAsync(true);

        var controller = new JobsController(context, aiMock.Object, searchMock.Object, creditMock.Object, notifyMock.Object);
        SetupControllerContext(controller, recruiterUser.Id);

        var response = await controller.SendJobEmailToCandidate(job.Id, candidate.Id, new SendJobEmailRequestDto());
        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var resultDto = Assert.IsType<SendJobEmailResultDto>(okResult.Value);

        Assert.True(resultDto.Success);
        Assert.Equal(3, resultDto.CreditsDeducted);
        Assert.Equal(3, resultDto.EmailCost);
        Assert.Equal(0, resultDto.ContactUnlockCost);
        Assert.Equal(0, resultDto.ResumeUnlockCost);

        // Ensure contact unlock and resume download were NOT deducted
        creditMock.Verify(c => c.DeductCreditsAsync(recruiter.Id, It.IsAny<int>(), TransactionType.RecruiterContactView, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);
        creditMock.Verify(c => c.DeductCreditsAsync(recruiter.Id, It.IsAny<int>(), TransactionType.RecruiterResumeDownload, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);
        // Only email was deducted
        creditMock.Verify(c => c.DeductCreditsAsync(recruiter.Id, 3, TransactionType.RecruiterCandidateEmail, candidate.Id.ToString(), It.IsAny<string>(), recruiterUser.Id), Times.Once);
    }

    [Fact]
    public async Task SendJobEmailToCandidate_FailsWith402_WhenInsufficientCredits()
    {
        var dbName = "TestDb_SendEmail_InsufficientCredits_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Greenwood High", City = "Bangalore" };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@greenwood.com", Role = Role.Recruiter, FirstName = "Jane", LastName = "Doe" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Credits = 2 };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "Physics Teacher",
            Description = "Teach physics.",
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate@example.com", Role = Role.Candidate, FirstName = "Vikrant", LastName = "Yadav" };
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "+919876543210" };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        await context.SaveChangesAsync();

        var aiMock = new Mock<IAiService>();
        var searchMock = new Mock<ISearchService>();
        var creditMock = new Mock<ICreditService>();
        var notifyMock = new Mock<INotificationService>();

        creditMock.Setup(c => c.GetBalanceAsync(recruiter.Id)).ReturnsAsync(2);
        creditMock.Setup(c => c.GetRatesAsync(recruiter.Id)).ReturnsAsync(new RecruiterCreditRate
        {
            CandidateEmailRate = 3,
            ContactViewRate = 2,
            ResumeDownloadRate = 5
        });

        var controller = new JobsController(context, aiMock.Object, searchMock.Object, creditMock.Object, notifyMock.Object);
        SetupControllerContext(controller, recruiterUser.Id);

        var response = await controller.SendJobEmailToCandidate(job.Id, candidate.Id, new SendJobEmailRequestDto());
        var statusResult = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(402, statusResult.StatusCode);

        // Verify no credits were deducted and no email was sent
        creditMock.Verify(c => c.DeductCreditsAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<TransactionType>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);
        notifyMock.Verify(n => n.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<EmailType>()), Times.Never);
    }
}
