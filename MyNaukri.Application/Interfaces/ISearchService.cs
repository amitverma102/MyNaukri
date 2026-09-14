using MyNaukri.Application.DTOs.Jobs;

namespace MyNaukri.Application.Interfaces;

public interface ISearchService
{
    Task<IEnumerable<JobDto>> SearchJobsAsync(string query, Guid? candidateId = null);
    Task<MyNaukri.Application.DTOs.SuperAdmin.PaginatedResultDto<JobDto>> SearchJobsAdvancedAsync(JobSearchQueryDto request, Guid? candidateId = null);
    Task<IEnumerable<MyNaukri.Application.DTOs.Candidates.CandidateSearchResultDto>> SearchCandidatesAsync(MyNaukri.Application.DTOs.Candidates.CandidateSearchRequestDto request);
    Task<IEnumerable<MyNaukri.Application.DTOs.Candidates.CandidateSearchResultDto>> GetAiMatchedCandidatesForJobAsync(Guid jobId, Guid? recruiterId = null);
}
