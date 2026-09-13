using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class AiResumeComparisonAndTailoringTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task CompareResumeWithJobAsync_ReturnsValidMatchScoreAndGapAnalysis()
    {
        using var context = CreateInMemoryDbContext();

        var candidateUser = new User
        {
            FirstName = "Ananya",
            LastName = "Sharma",
            Email = "ananya.sharma@example.com"
        };
        context.Users.Add(candidateUser);

        var candidate = new Candidate
        {
            UserId = candidateUser.Id,
            User = candidateUser,
            Skills = "Mathematics, Calculus, CBSE, Lesson Planning, Pedagogy",
            Summary = "Experienced Senior Secondary Mathematics Educator with 5 years CBSE teaching experience.",
            TotalExperienceYears = 5,
            CurrentLocation = "Noida",
            ClassesTaught = "11th, 12th",
            BoardsTaught = "CBSE",
            Education = "M.Sc Mathematics, B.Ed"
        };
        context.Candidates.Add(candidate);

        var institution = new Institution
        {
            Name = "Delhi World Public School",
            Address = "Noida Expressway, Sector 128"
        };
        context.Institutions.Add(institution);

        var recruiter = new Recruiter
        {
            UserId = Guid.NewGuid(),
            InstitutionId = institution.Id
        };
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "PGT Mathematics Teacher",
            Description = "We are seeking a PGT Mathematics teacher for Class 11 and 12 CBSE curriculum.",
            Requirements = "M.Sc in Mathematics with B.Ed. Minimum 3 years experience teaching CBSE Class 11-12. Experience with smartboard tools.",
            Location = "Noida",
            BoardAffiliation = "CBSE",
            SubjectDepartment = "Mathematics",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            Institution = institution
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty); // Test fallback logic

        var loggerMock = new Mock<ILogger<DbAiService>>();

        var aiService = new DbAiService(context, configMock.Object, loggerMock.Object);

        var comparison = await aiService.CompareResumeWithJobAsync(candidate.Id, job.Id);

        Assert.NotNull(comparison);
        Assert.Equal(job.Id, comparison.JobId);
        Assert.Equal("PGT Mathematics Teacher", comparison.JobTitle);
        Assert.Equal("Delhi World Public School", comparison.CompanyName);
        Assert.True(comparison.MatchScore >= 50 && comparison.MatchScore <= 100);
        Assert.NotEmpty(comparison.MatchSummary);
        Assert.Contains("Mathematics", comparison.MatchedSkills);
        Assert.NotNull(comparison.ExperienceMatch);
        Assert.True(comparison.ExperienceMatch.IsMatch);
        Assert.NotNull(comparison.EducationMatch);
        Assert.True(comparison.EducationMatch.IsMatch);
        Assert.NotNull(comparison.LocationMatch);
        Assert.True(comparison.LocationMatch.IsMatch);
        Assert.NotEmpty(comparison.Strengths);
        Assert.NotEmpty(comparison.ImprovementSuggestions);
    }

    [Fact]
    public async Task TailorResumeForJobAsync_GeneratesTailoredHeadlineSummaryAndBulletPoints()
    {
        using var context = CreateInMemoryDbContext();

        var candidateUser = new User
        {
            FirstName = "Rajesh",
            LastName = "Kumar",
            Email = "rajesh.kumar@example.com"
        };
        context.Users.Add(candidateUser);

        var candidate = new Candidate
        {
            UserId = candidateUser.Id,
            User = candidateUser,
            Skills = "Physics, Laboratory Management, CBSE, STEM",
            Summary = "Physics teacher passionate about experiential learning.",
            TotalExperienceYears = 4,
            ClassesTaught = "9th, 10th, 11th, 12th",
            BoardsTaught = "CBSE",
            Education = "M.Sc Physics, B.Ed"
        };
        context.Candidates.Add(candidate);

        var institution = new Institution
        {
            Name = "Heritage International School"
        };
        context.Institutions.Add(institution);

        var recruiter = new Recruiter
        {
            UserId = Guid.NewGuid(),
            InstitutionId = institution.Id
        };
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "PGT Physics Educator",
            Description = "Looking for PGT Physics educator adept at practical laboratory pedagogy and board preparation.",
            Requirements = "Master's degree in Physics + B.Ed. Proven experience in board results.",
            BoardAffiliation = "CBSE",
            SubjectDepartment = "Physics",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            Institution = institution
        };
        context.Jobs.Add(job);
        await context.SaveChangesAsync();

        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty); // Fallback test

        var loggerMock = new Mock<ILogger<DbAiService>>();

        var aiService = new DbAiService(context, configMock.Object, loggerMock.Object);

        var tailored = await aiService.TailorResumeForJobAsync(candidate.Id, job.Id);

        Assert.NotNull(tailored);
        Assert.Equal(job.Id, tailored.JobId);
        Assert.Equal("PGT Physics Educator", tailored.JobTitle);
        Assert.False(string.IsNullOrWhiteSpace(tailored.TailoredHeadline));
        Assert.False(string.IsNullOrWhiteSpace(tailored.TailoredSummary));
        Assert.NotEmpty(tailored.TailoredBulletPoints);
        Assert.NotEmpty(tailored.RecommendedSkillsToAdd);
        Assert.False(string.IsNullOrWhiteSpace(tailored.CoverNotePitch));
        Assert.Contains("Heritage International School", tailored.CoverNotePitch);
    }
}
