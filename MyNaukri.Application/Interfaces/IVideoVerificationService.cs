using MyNaukri.Application.DTOs.Candidates;

namespace MyNaukri.Application.Interfaces;

public interface IVideoVerificationService
{
    Task<VideoVerificationResultDto> VerifyVideoAsync(string videoUrl, CancellationToken cancellationToken = default);
}
