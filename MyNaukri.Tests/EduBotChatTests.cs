using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.Ai;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class EduBotChatTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Theory]
    [InlineData("Can you give me a recipe for making pepperoni pizza?")]
    [InlineData("Who won the IPL cricket match yesterday and what was Virat Kohli's score?")]
    [InlineData("Should I buy Bitcoin and Ethereum crypto today?")]
    [InlineData("Tell me about latest Bollywood movie gossips and actor scandals")]
    public async Task EduBot_OffTopicGuardrails_SoftlyDeniesNonEducationalQueries(string query)
    {
        using var context = CreateInMemoryDbContext();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null); // Fallback deterministic mode

        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = query
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.True(result.IsOffTopic, $"Expected query '{query}' to be marked IsOffTopic == true");
        Assert.Equal("guardrail_denial", result.ActionType);
        Assert.Contains("EduBot", result.Response);
        Assert.Contains("Education & EduTech", result.Response);
        Assert.NotEmpty(result.SuggestedPrompts);
    }

    [Fact]
    public async Task EduBot_SkillsUpgradation_ReturnsComprehensivePedagogicalGuide()
    {
        using var context = CreateInMemoryDbContext();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);

        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "What are the key skills and certifications like CTET, B.Ed, and LMS needed for modern teaching?"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.False(result.IsOffTopic);
        Assert.Equal("skills_guide", result.ActionType);
        Assert.Contains("CTET", result.Response);
        Assert.Contains("B.Ed", result.Response);
        Assert.Contains("LMS", result.Response);
        Assert.NotEmpty(result.SuggestedPrompts);
    }

    [Fact]
    public async Task EduBot_RecruiterAssistance_ReturnsHiringAndResdexGuidance()
    {
        using var context = CreateInMemoryDbContext();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);

        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "How can a school recruiter search teacher profiles using Resdex and post jobs on Edukey360?"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.False(result.IsOffTopic);
        Assert.Equal("recruiter_help", result.ActionType);
        Assert.Contains("Resdex", result.Response);
        Assert.Contains("Recruiter", result.Response);
    }

    [Fact]
    public async Task EduBot_JobSearchQuery_MatchesAndReturnsActiveDatabaseJobs()
    {
        using var context = CreateInMemoryDbContext();
        var institution = new Institution
        {
            Name = "Heritage Global School",
            CreatedAt = DateTime.UtcNow
        };
        context.Institutions.Add(institution);

        var job = new Job
        {
            Title = "Senior PGT Mathematics Teacher",
            Description = "Teach 11th and 12th grade CBSE curriculum.",
            Requirements = "M.Sc Mathematics with B.Ed",
            Location = "Delhi NCR",
            SubjectDepartment = "Mathematics",
            BoardAffiliation = "CBSE",
            MinSalary = 700000,
            MaxSalary = 1000000,
            JobType = JobType.FullTime,
            WorkMode = "OnSite",
            IsActive = true,
            InstitutionId = institution.Id,
            CreatedAt = DateTime.UtcNow
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);

        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "Show me Mathematics teacher jobs in Delhi"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.False(result.IsOffTopic);
        Assert.Equal("job_search", result.ActionType);
        Assert.NotNull(result.MatchingJobs);
        Assert.Single(result.MatchingJobs);
        Assert.Equal("Senior PGT Mathematics Teacher", result.MatchingJobs[0].Title);
        Assert.Equal("Heritage Global School", result.MatchingJobs[0].CompanyName);
    }

    [Fact]
    public async Task EduBotController_Chat_ReturnsOkWithResponse()
    {
        var mockAiService = new Mock<IAiService>();
        mockAiService.Setup(s => s.ChatWithEduBotAsync(It.IsAny<EduBotChatRequestDto>()))
            .ReturnsAsync(new EduBotChatResponseDto
            {
                Response = "Hello educator!",
                IsOffTopic = false,
                ActionType = "career_advice",
                SuggestedPrompts = new List<string> { "Find jobs" }
            });

        var controller = new EduBotController(mockAiService.Object);

        var result = await controller.Chat(new EduBotChatRequestDto { Message = "Hello EduBot" });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var chatResponse = Assert.IsType<EduBotChatResponseDto>(okResult.Value);
        Assert.Equal("Hello educator!", chatResponse.Response);
    }

    [Fact]
    public async Task EduBotController_Chat_EmptyMessage_ReturnsBadRequest()
    {
        var mockAiService = new Mock<IAiService>();
        var controller = new EduBotController(mockAiService.Object);

        var result = await controller.Chat(new EduBotChatRequestDto { Message = "   " });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Theory]
    [InlineData("jobs posted by recruiter 1")]
    [InlineData("show jobs posted by recruiter")]
    [InlineData("recruiter 1 jobs")]
    [InlineData("jobs by recruiter 1")]
    [InlineData("show jobs of recruiter 1")]
    public async Task EduBot_RecruiterJobQuery_NonLoggedInUser_IsDeniedByGuardrail(string query)
    {
        using var context = CreateInMemoryDbContext();
        var institution = new Institution { Name = "St. Jude Global", CreatedAt = DateTime.UtcNow };
        context.Institutions.Add(institution);

        var user = new User { FirstName = "Recruiter", LastName = "1", Email = "recruiter1@school.org", Role = Role.Recruiter };
        context.Users.Add(user);

        var recruiter = new Recruiter { UserId = user.Id, InstitutionId = institution.Id };
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "PGT Physics Teacher",
            Description = "Senior secondary Physics",
            Location = "Delhi",
            IsActive = true,
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        // Non-logged in request
        var request = new EduBotChatRequestDto
        {
            Message = query,
            UserId = null,
            UserRole = null
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.Equal("guardrail_denial", result.ActionType);
        Assert.Null(result.MatchingJobs);
        Assert.Contains("Access Restricted", result.Response);
        Assert.Contains("Authentication Required", result.Response);
    }

    [Fact]
    public async Task EduBot_RecruiterJobQuery_CandidateUser_IsDeniedByGuardrail()
    {
        using var context = CreateInMemoryDbContext();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "Show me jobs posted by recruiter 1",
            UserId = Guid.NewGuid(),
            UserRole = "Candidate"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.Equal("guardrail_denial", result.ActionType);
        Assert.Null(result.MatchingJobs);
        Assert.Contains("Access Restricted", result.Response);
        Assert.Contains("educator/candidate", result.Response);
    }

    [Fact]
    public async Task EduBot_RecruiterJobQuery_RecruiterOwnJobs_IsAllowed()
    {
        using var context = CreateInMemoryDbContext();
        var institution = new Institution { Name = "Modern Academy", CreatedAt = DateTime.UtcNow };
        context.Institutions.Add(institution);

        var recruiterUser = new User { FirstName = "Sarah", LastName = "Connor", Email = "sarah@academy.org", Role = Role.Recruiter };
        context.Users.Add(recruiterUser);

        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id };
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "TGT English Faculty",
            Description = "Secondary English teacher",
            Location = "Mumbai",
            IsActive = true,
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "Show my posted jobs",
            UserId = recruiterUser.Id,
            UserRole = "Recruiter"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.Equal("job_search", result.ActionType);
        Assert.NotNull(result.MatchingJobs);
        Assert.Single(result.MatchingJobs);
        Assert.Equal("TGT English Faculty", result.MatchingJobs[0].Title);
        Assert.Contains("Your Posted Jobs", result.Response);
    }

    [Fact]
    public async Task EduBot_RecruiterJobQuery_RecruiterOtherRecruiterJobs_IsDenied()
    {
        using var context = CreateInMemoryDbContext();
        var institution = new Institution { Name = "Modern Academy", CreatedAt = DateTime.UtcNow };
        context.Institutions.Add(institution);

        var recruiter1User = new User { FirstName = "Sarah", LastName = "Connor", Email = "sarah@academy.org", Role = Role.Recruiter };
        var recruiter2User = new User { FirstName = "John", LastName = "Doe", Email = "recruiter2@academy.org", Role = Role.Recruiter };
        context.Users.AddRange(recruiter1User, recruiter2User);

        var recruiter1 = new Recruiter { UserId = recruiter1User.Id, InstitutionId = institution.Id };
        var recruiter2 = new Recruiter { UserId = recruiter2User.Id, InstitutionId = institution.Id };
        context.Recruiters.AddRange(recruiter1, recruiter2);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        // Recruiter 1 queries Recruiter 2's jobs
        var request = new EduBotChatRequestDto
        {
            Message = "jobs posted by recruiter 2",
            UserId = recruiter1User.Id,
            UserRole = "Recruiter"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.Equal("guardrail_denial", result.ActionType);
        Assert.Null(result.MatchingJobs);
        Assert.Contains("Recruiter Data Isolation", result.Response);
    }

    [Fact]
    public async Task EduBot_RecruiterJobQuery_InstituteAdmin_SameInstituteRecruiter_IsAllowed()
    {
        using var context = CreateInMemoryDbContext();
        var institution = new Institution { Name = "Apex Education Trust", CreatedAt = DateTime.UtcNow };
        context.Institutions.Add(institution);

        var adminUser = new User { FirstName = "Principal", LastName = "Gupta", Email = "admin@apex.org", Role = Role.InstituteAdministrator };
        var recruiterUser = new User { FirstName = "Recruiter", LastName = "1", Email = "recruiter1@apex.org", Role = Role.Recruiter };
        context.Users.AddRange(adminUser, recruiterUser);

        var adminProfile = new InstituteAdminProfile { UserId = adminUser.Id, InstitutionId = institution.Id };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id };
        context.InstituteAdminProfiles.Add(adminProfile);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "Computer Science Lecturer",
            Description = "Teach programming & AI",
            Location = "Bangalore",
            IsActive = true,
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "show jobs posted by recruiter 1",
            UserId = adminUser.Id,
            UserRole = "InstituteAdministrator"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.Equal("job_search", result.ActionType);
        Assert.NotNull(result.MatchingJobs);
        Assert.Single(result.MatchingJobs);
        Assert.Equal("Computer Science Lecturer", result.MatchingJobs[0].Title);
    }

    [Fact]
    public async Task EduBot_RecruiterJobQuery_InstituteAdmin_OtherInstituteRecruiter_IsDenied()
    {
        using var context = CreateInMemoryDbContext();
        var inst1 = new Institution { Name = "Institute A", CreatedAt = DateTime.UtcNow };
        var inst2 = new Institution { Name = "Institute B", CreatedAt = DateTime.UtcNow };
        context.Institutions.AddRange(inst1, inst2);

        var adminUser = new User { FirstName = "Admin", LastName = "A", Email = "admin@inst-a.org", Role = Role.InstituteAdministrator };
        var otherRecruiterUser = new User { FirstName = "Recruiter", LastName = "2", Email = "recruiter2@inst-b.org", Role = Role.Recruiter };
        context.Users.AddRange(adminUser, otherRecruiterUser);

        var adminProfile = new InstituteAdminProfile { UserId = adminUser.Id, InstitutionId = inst1.Id };
        var otherRecruiter = new Recruiter { UserId = otherRecruiterUser.Id, InstitutionId = inst2.Id };
        context.InstituteAdminProfiles.Add(adminProfile);
        context.Recruiters.Add(otherRecruiter);

        var otherJob = new Job
        {
            Title = "Chemistry Faculty",
            Location = "Pune",
            IsActive = true,
            RecruiterId = otherRecruiter.Id,
            InstitutionId = inst2.Id
        };
        context.Jobs.Add(otherJob);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        // Admin of Institute A asks for jobs posted by recruiter 2 (who belongs to Institute B)
        var request = new EduBotChatRequestDto
        {
            Message = "jobs posted by recruiter 2",
            UserId = adminUser.Id,
            UserRole = "InstituteAdministrator"
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.Equal("guardrail_denial", result.ActionType);
        Assert.Null(result.MatchingJobs);
        Assert.Contains("Institute Hierarchy Guardrail", result.Response);
    }

    [Fact]
    public async Task EduBot_InstitutionQuery_JobsPostedByKapsConsultancy_NonLoggedInUser_IsAllowed()
    {
        using var context = CreateInMemoryDbContext();
        var institution = new Institution { Name = "KAPS Consultancy", CreatedAt = DateTime.UtcNow };
        context.Institutions.Add(institution);

        var job = new Job
        {
            Title = "STEM & Robotics Educator",
            Description = "Lead robotics labs across schools",
            Location = "Delhi NCR",
            IsActive = true,
            InstitutionId = institution.Id
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var request = new EduBotChatRequestDto
        {
            Message = "jobs posted by KAPS Consultancy",
            UserId = null,
            UserRole = null
        };

        var result = await aiService.ChatWithEduBotAsync(request);

        Assert.NotNull(result);
        Assert.False(result.IsOffTopic);
        Assert.Equal("job_search", result.ActionType);
        Assert.NotNull(result.MatchingJobs);
        Assert.Single(result.MatchingJobs);
        Assert.Equal("STEM & Robotics Educator", result.MatchingJobs[0].Title);
        Assert.Equal("KAPS Consultancy", result.MatchingJobs[0].CompanyName);
    }

    [Fact]
    public async Task EduBotController_Chat_UnauthenticatedUser_CannotSpoofIdentity()
    {
        EduBotChatRequestDto? capturedRequest = null;
        var mockAiService = new Mock<IAiService>();
        mockAiService.Setup(s => s.ChatWithEduBotAsync(It.IsAny<EduBotChatRequestDto>()))
            .Callback<EduBotChatRequestDto>(r => capturedRequest = r)
            .ReturnsAsync(new EduBotChatResponseDto
            {
                Response = "Hello",
                ActionType = "career_advice"
            });

        var controller = new EduBotController(mockAiService.Object);
        // User is not authenticated on controller HttpContext

        var spoofedRequest = new EduBotChatRequestDto
        {
            Message = "jobs posted by recruiter 1",
            UserId = Guid.NewGuid(),
            UserRole = "SuperAdministrator"
        };

        await controller.Chat(spoofedRequest);

        Assert.NotNull(capturedRequest);
        Assert.Null(capturedRequest.UserId);
        Assert.Null(capturedRequest.UserRole);
    }
}
