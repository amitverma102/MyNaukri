namespace MyNaukri.Application.Interfaces;

public interface IStorageService
{
    Task<string> UploadResumeAsync(byte[] fileData, string fileName, Guid candidateId);
}
