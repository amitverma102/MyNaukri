using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using MyNaukri.Application.DTOs.Candidates;

namespace MyNaukri.Infrastructure.Services;

public class MockAiService : IAiService
{
    public Task<ParsedResumeDto> ParseResumeAsync(byte[] resumeData, string fileName)
    {
        // Mock delay to simulate AI processing
        var mockResult = new MyNaukri.Application.DTOs.Candidates.ParsedResumeDto
        {
            Skills = "C#, .NET, React, SQL",
            TotalExperienceYears = 3,
            PhoneNumber = "9876543210",
            CurrentLocation = "Mock City",
            ClassesTaught = "10th, 12th",
            BoardsTaught = "CBSE",
            Education = "B.Tech in Computer Science",
            Certifications = "Microsoft Certified: Azure Developer Associate"
        };
        return Task.FromResult(mockResult);
    }

    public Task<IEnumerable<JobDto>> GetJobRecommendationsAsync(Guid candidateId)
    {
        // Mock recommended jobs based on AI candidate profile matching
        var recommendedJobs = new List<JobDto>
        {
            new JobDto
            {
                Id = Guid.NewGuid(),
                Title = "Senior AI Education Engineer (Mock Recommendation)",
                Description = "Looking for a C# / React expert to build AI portals.",
                Location = "Gurugram, HR",
                JobType = JobType.FullTime,
                MinSalary = 100000,
                MaxSalary = 150000,
                CreatedAt = DateTime.UtcNow
            },
            new JobDto
            {
                Id = Guid.NewGuid(),
                Title = "University Software Architect (Mock Recommendation)",
                Description = "Lead architecture for our education systems.",
                Location = "New Delhi, DL",
                JobType = JobType.FullTime,
                MinSalary = 120000,
                MaxSalary = 160000,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            }
        };

        return Task.FromResult<IEnumerable<JobDto>>(recommendedJobs);
    }
}
