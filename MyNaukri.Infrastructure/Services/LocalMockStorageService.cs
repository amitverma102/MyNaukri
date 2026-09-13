using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services;

public class LocalMockStorageService : IStorageService
{
    public async Task<string> UploadResumeAsync(byte[] fileData, string fileName, Guid candidateId)
    {
        // For MVP, save to a local uploads directory
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "resumes");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"{candidateId}_{Guid.NewGuid()}_{fileName}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        await File.WriteAllBytesAsync(filePath, fileData);

        // Return a relative URL path that could be served statically
        return $"/uploads/resumes/{uniqueFileName}";
    }

    public async Task<string> UploadImageAsync(byte[] fileData, string fileName, string folder)
    {
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", folder);
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        await File.WriteAllBytesAsync(filePath, fileData);

        return $"/uploads/{folder}/{uniqueFileName}";
    }
}
