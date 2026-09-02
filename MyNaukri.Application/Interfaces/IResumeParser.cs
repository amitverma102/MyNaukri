using MyNaukri.Application.DTOs.Candidates;

namespace MyNaukri.Application.Interfaces;

public interface IResumeParser
{
    Task<ParsedResumeDto> ParseAsync(byte[] fileData, string fileName);
}
