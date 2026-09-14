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
}
