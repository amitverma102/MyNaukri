using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class CandidateSearchFilterTests
{
    private DbContextOptions<ApplicationDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    [Fact]
    public async Task SearchCandidatesAsync_FilterByLastUpdatedDays_ReturnsExpectedCandidates()
    {
        var dbName = "CandidateFilterDb_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);

        using (var context = new ApplicationDbContext(options))
        {
            var user1 = new User { FirstName = "John", LastName = "OneDay", Email = "john@example.com", Role = Role.Candidate };
            var user2 = new User { FirstName = "Sarah", LastName = "FiveDays", Email = "sarah@example.com", Role = Role.Candidate };
            var user3 = new User { FirstName = "Mike", LastName = "TwelveDays", Email = "mike@example.com", Role = Role.Candidate };
            var user4 = new User { FirstName = "Emma", LastName = "TwentyFiveDays", Email = "emma@example.com", Role = Role.Candidate };
            var user5 = new User { FirstName = "David", LastName = "TwoMonths", Email = "david@example.com", Role = Role.Candidate };

            context.Users.AddRange(user1, user2, user3, user4, user5);
            await context.SaveChangesAsync();

            // Candidate 1: Updated 6 hours ago
            var candidate1 = new Candidate
            {
                UserId = user1.Id,
                Skills = "Math, Physics",
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddHours(-6)
            };

            // Candidate 2: Updated 5 days ago
            var candidate2 = new Candidate
            {
                UserId = user2.Id,
                Skills = "Math, Chemistry",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            };

            // Candidate 3: Created 12 days ago, never updated (UpdatedAt is null)
            var candidate3 = new Candidate
            {
                UserId = user3.Id,
                Skills = "English, History",
                CreatedAt = DateTime.UtcNow.AddDays(-12),
                UpdatedAt = null
            };

            // Candidate 4: Updated 25 days ago
            var candidate4 = new Candidate
            {
                UserId = user4.Id,
                Skills = "Biology, Science",
                CreatedAt = DateTime.UtcNow.AddDays(-40),
                UpdatedAt = DateTime.UtcNow.AddDays(-25)
            };

            // Candidate 5: Updated 60 days ago
            var candidate5 = new Candidate
            {
                UserId = user5.Id,
                Skills = "Computer Science",
                CreatedAt = DateTime.UtcNow.AddDays(-90),
                UpdatedAt = DateTime.UtcNow.AddDays(-60)
            };

            context.Candidates.AddRange(candidate1, candidate2, candidate3, candidate4, candidate5);
            await context.SaveChangesAsync();
        }

        using (var context = new ApplicationDbContext(options))
        {
            var searchService = new DbSearchService(context);

            // 1. Without last updated filter => should return all 5
            var allResult = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto())).ToList();
            Assert.Equal(5, allResult.Count);

            // 2. Filter 1 Day (Last 24h) => only Candidate 1 (updated 6 hrs ago)
            var oneDayResult = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto
            {
                LastUpdatedDays = 1
            })).ToList();
            Assert.Single(oneDayResult);
            Assert.Equal("John", oneDayResult[0].FirstName);
            Assert.NotNull(oneDayResult[0].UpdatedAt);

            // 3. Filter 1 Week (7 Days) => Candidate 1 (6 hrs ago) & Candidate 2 (5 days ago)
            var oneWeekResult = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto
            {
                LastUpdatedDays = 7
            })).ToList();
            Assert.Equal(2, oneWeekResult.Count);
            Assert.Contains(oneWeekResult, c => c.FirstName == "John");
            Assert.Contains(oneWeekResult, c => c.FirstName == "Sarah");

            // 4. Filter 15 Days => Candidate 1, 2, and 3 (Candidate 3 has UpdatedAt = null, CreatedAt = 12 days ago)
            var fifteenDaysResult = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto
            {
                LastUpdatedDays = 15
            })).ToList();
            Assert.Equal(3, fifteenDaysResult.Count);
            Assert.Contains(fifteenDaysResult, c => c.FirstName == "Mike");

            // 5. Filter 1 Month (30 Days) => Candidate 1, 2, 3, and 4 (25 days ago)
            var thirtyDaysResult = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto
            {
                LastUpdatedDays = 30
            })).ToList();
            Assert.Equal(4, thirtyDaysResult.Count);
            Assert.DoesNotContain(thirtyDaysResult, c => c.FirstName == "David");

            // 6. Verify Results are ordered by most recently updated/created first
            var orderedList = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto())).ToList();
            Assert.Equal("John", orderedList[0].FirstName); // 6 hours ago
            Assert.Equal("Sarah", orderedList[1].FirstName); // 5 days ago
            Assert.Equal("Mike", orderedList[2].FirstName); // 12 days ago
            Assert.Equal("Emma", orderedList[3].FirstName); // 25 days ago
            Assert.Equal("David", orderedList[4].FirstName); // 60 days ago
        }
    }

    [Fact]
    public async Task ApplicationDbContext_SavingModifiedEntity_SetsUpdatedAt()
    {
        var dbName = "CandidateTimestampDb_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);

        Guid candidateId;
        using (var context = new ApplicationDbContext(options))
        {
            var user = new User { FirstName = "Alex", LastName = "Ray", Email = "alex@example.com", Role = Role.Candidate };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var candidate = new Candidate
            {
                UserId = user.Id,
                Skills = "Initial Skills",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = null
            };
            context.Candidates.Add(candidate);
            await context.SaveChangesAsync();
            candidateId = candidate.Id;
        }

        using (var context = new ApplicationDbContext(options))
        {
            var candidate = await context.Candidates.FindAsync(candidateId);
            Assert.NotNull(candidate);
            Assert.Null(candidate.UpdatedAt);

            // Modify candidate
            candidate.Skills = "Updated Skills React, C#";
            await context.SaveChangesAsync();
        }

        using (var context = new ApplicationDbContext(options))
        {
            var candidate = await context.Candidates.FindAsync(candidateId);
            Assert.NotNull(candidate);
            Assert.NotNull(candidate.UpdatedAt);
            Assert.True(candidate.UpdatedAt > DateTime.UtcNow.AddMinutes(-1));
        }
    }

    [Fact]
    public async Task SearchCandidatesAsync_CalculatesAiRecommendationScore_AndOrdersByAiMatch()
    {
        var dbName = "CandidateAiScoreDb_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);

        using (var context = new ApplicationDbContext(options))
        {
            var userA = new User { FirstName = "Priya", LastName = "Sharma", Email = "priya@example.com", Role = Role.Candidate };
            var userB = new User { FirstName = "Rohan", LastName = "Verma", Email = "rohan@example.com", Role = Role.Candidate };
            var userC = new User { FirstName = "Anita", LastName = "Desai", Email = "anita@example.com", Role = Role.Candidate };

            context.Users.AddRange(userA, userB, userC);
            await context.SaveChangesAsync();

            // Candidate A: Perfect match for Maths, 5 yrs, CBSE, Delhi, CTET, Demo
            var candidateA = new Candidate
            {
                UserId = userA.Id,
                Skills = "Mathematics, Algebra, Calculus, Trigonometry",
                Summary = "Passionate senior secondary mathematics educator.",
                Education = "M.Sc Mathematics, B.Ed",
                TotalExperienceYears = 5,
                CurrentLocation = "Delhi NCR",
                ClassesTaught = "11th, 12th",
                BoardsTaught = "CBSE",
                IsCtetQualified = true,
                DemoVideoStatus = VideoVerificationStatus.Verified,
                DemoVideoSubject = "Mathematics Calculus Demo",
                NoticePeriod = "Immediate",
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            };

            // Candidate B: Partial match (English, 2 yrs, Mumbai)
            var candidateB = new Candidate
            {
                UserId = userB.Id,
                Skills = "English Literature, Creative Writing",
                Summary = "Middle school English language teacher.",
                Education = "M.A English, B.Ed",
                TotalExperienceYears = 2,
                CurrentLocation = "Mumbai",
                ClassesTaught = "6th, 7th, 8th",
                BoardsTaught = "ICSE",
                IsCtetQualified = false,
                DemoVideoStatus = VideoVerificationStatus.Unverified,
                NoticePeriod = "60 Days",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            // Candidate C: Maths, but 12 yrs (over target), Bengaluru
            var candidateC = new Candidate
            {
                UserId = userC.Id,
                Skills = "Mathematics, Statistics",
                Summary = "Experienced mathematics professor.",
                Education = "Ph.D Mathematics",
                TotalExperienceYears = 12,
                CurrentLocation = "Bengaluru",
                ClassesTaught = "Undergraduate",
                BoardsTaught = "State Board",
                IsCtetQualified = false,
                DemoVideoStatus = VideoVerificationStatus.Unverified,
                NoticePeriod = "30 Days",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            };

            context.Candidates.AddRange(candidateA, candidateB, candidateC);
            await context.SaveChangesAsync();
        }

        using (var context = new ApplicationDbContext(options))
        {
            var searchService = new DbSearchService(context);

            var request = new CandidateSearchRequestDto
            {
                Keyword = "Mathematics, Calculus",
                SortBy = "aiMatch"
            };

            var results = (await searchService.SearchCandidatesAsync(request)).ToList();

            // Candidates returned with Priya Sharma having the highest AI match score
            Assert.NotEmpty(results);
            var topCandidate = results[0];
            Assert.Equal("Priya", topCandidate.FirstName);
            Assert.NotNull(topCandidate.AiRecommendationScore);
            Assert.True(topCandidate.AiRecommendationScore >= 85, $"Expected score >= 85, got {topCandidate.AiRecommendationScore}");
            Assert.NotNull(topCandidate.AiRecommendationReason);
            Assert.Contains("Keywords", topCandidate.AiRecommendationReason);

            // Candidate C (unverified, no CTET) should have lower score than Priya
            var candCResult = results.FirstOrDefault(r => r.FirstName == "Anita");
            Assert.NotNull(candCResult);
            Assert.True(topCandidate.AiRecommendationScore > candCResult.AiRecommendationScore);
        }
    }

    [Fact]
    public async Task SearchCandidatesAsync_ExplicitSortBy_OrdersAccordingly()
    {
        var dbName = "CandidateSortDb_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);

        using (var context = new ApplicationDbContext(options))
        {
            var userJunior = new User { FirstName = "Junior", LastName = "Dev", Email = "junior@example.com", Role = Role.Candidate };
            var userSenior = new User { FirstName = "Senior", LastName = "Lead", Email = "senior@example.com", Role = Role.Candidate };

            context.Users.AddRange(userJunior, userSenior);
            await context.SaveChangesAsync();

            var candJunior = new Candidate
            {
                UserId = userJunior.Id,
                Skills = "Physics",
                TotalExperienceYears = 2,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddHours(-1) // Most recently active
            };

            var candSenior = new Candidate
            {
                UserId = userSenior.Id,
                Skills = "Physics",
                TotalExperienceYears = 15,
                CreatedAt = DateTime.UtcNow.AddDays(-100),
                UpdatedAt = DateTime.UtcNow.AddDays(-20) // Older update
            };

            context.Candidates.AddRange(candJunior, candSenior);
            await context.SaveChangesAsync();
        }

        using (var context = new ApplicationDbContext(options))
        {
            var searchService = new DbSearchService(context);

            // Sort by experience
            var byExp = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto { SortBy = "experience" })).ToList();
            Assert.Equal("Senior", byExp[0].FirstName);

            // Sort by last updated
            var byUpdated = (await searchService.SearchCandidatesAsync(new CandidateSearchRequestDto { SortBy = "lastupdated" })).ToList();
            Assert.Equal("Junior", byUpdated[0].FirstName);
        }
    }
}
