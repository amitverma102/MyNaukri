using MyNaukri.Application.DTOs.Jobs;

namespace MyNaukri.Application.Interfaces;

public interface ISearchService
{
    Task<IEnumerable<JobDto>> SearchJobsAsync(string query);
    Task<IEnumerable<MyNaukri.Application.DTOs.Candidates.CandidateSearchResultDto>> SearchCandidatesAsync(MyNaukri.Application.DTOs.Candidates.CandidateSearchRequestDto request);
}
