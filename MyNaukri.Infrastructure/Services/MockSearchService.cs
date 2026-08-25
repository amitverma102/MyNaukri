using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Infrastructure.Services;

public class MockSearchService : ISearchService
{
    public Task<IEnumerable<JobDto>> SearchJobsAsync(string query, Guid? candidateId = null)
    {
        // Mock search results
        var results = new List<JobDto>
        {
            new JobDto
            {
                Id = Guid.NewGuid(),
                Title = $"Senior {query} Teacher",
                Description = $"We are looking for a highly qualified {query} teacher.",
                Location = "Remote",
                JobType = JobType.FullTime,
                MinSalary = 70000,
                MaxSalary = 90000,
                CreatedAt = DateTime.UtcNow
            }
        };

        return Task.FromResult<IEnumerable<JobDto>>(results);
    }

    public Task<IEnumerable<MyNaukri.Application.DTOs.Candidates.CandidateSearchResultDto>> SearchCandidatesAsync(MyNaukri.Application.DTOs.Candidates.CandidateSearchRequestDto request)
    {
        return Task.FromResult<IEnumerable<MyNaukri.Application.DTOs.Candidates.CandidateSearchResultDto>>(new List<MyNaukri.Application.DTOs.Candidates.CandidateSearchResultDto>());
    }
}
