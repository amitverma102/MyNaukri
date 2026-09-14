using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.DTOs.Ai;

namespace MyNaukri.Application.Interfaces;

public interface IAiService
{
    Task<ParsedResumeDto> ParseResumeAsync(byte[] resumeData, string fileName);
    Task<IEnumerable<JobDto>> GetJobRecommendationsAsync(Guid candidateId);
    Task<JobResumeComparisonDto> CompareResumeWithJobAsync(Guid candidateId, Guid jobId);
    Task<TailoredResumeDto> TailorResumeForJobAsync(Guid candidateId, Guid jobId);
    Task<ParsedJobDescriptionDto> ParseJobDescriptionAsync(byte[] fileData, string fileName);
    Task<EduBotChatResponseDto> ChatWithEduBotAsync(EduBotChatRequestDto request);
}
