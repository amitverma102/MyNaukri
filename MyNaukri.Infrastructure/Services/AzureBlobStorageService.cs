using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services;

public class AzureBlobStorageService : IStorageService
{
    private readonly AzureBlobStorageSettings _settings;
    private readonly BlobServiceClient? _blobServiceClient;

    public AzureBlobStorageService(IOptions<AzureBlobStorageSettings> settings)
    {
        _settings = settings.Value;
        
        // In a real application, you might want to handle an empty connection string gracefully
        // or ensure it's configured during startup validation.
        if (!string.IsNullOrEmpty(_settings.ConnectionString))
        {
            _blobServiceClient = new BlobServiceClient(_settings.ConnectionString);
        }
    }

    public async Task<string> UploadResumeAsync(byte[] fileData, string fileName, Guid candidateId)
    {
        if (_blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_settings.ContainerName);
            await containerClient.CreateIfNotExistsAsync(PublicAccessType.BlobContainer);

            var uniqueFileName = $"{candidateId}_{Guid.NewGuid()}_{fileName}";
            var blobClient = containerClient.GetBlobClient(uniqueFileName);

            using var stream = new MemoryStream(fileData);
            await blobClient.UploadAsync(stream, overwrite: true);

            return blobClient.Uri.ToString();
        }

        // Graceful fallback to local wwwroot when Azure Blob is not configured
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "resumes");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var localUniqueFileName = $"{candidateId}_{Guid.NewGuid()}_{fileName}";
        var filePath = Path.Combine(uploadsFolder, localUniqueFileName);
        await File.WriteAllBytesAsync(filePath, fileData);

        return $"/uploads/resumes/{localUniqueFileName}";
    }

    public async Task<string> UploadImageAsync(byte[] fileData, string fileName, string folder)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";

        if (_blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient("images");
            await containerClient.CreateIfNotExistsAsync(PublicAccessType.BlobContainer);

            var blobPath = $"{folder}/{uniqueFileName}";
            var blobClient = containerClient.GetBlobClient(blobPath);

            var headers = new BlobHttpHeaders();
            headers.ContentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".svg" => "image/svg+xml",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };

            using var stream = new MemoryStream(fileData);
            await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers });

            return blobClient.Uri.ToString();
        }

        // Graceful fallback to local wwwroot when Azure Blob is not configured
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", folder);
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, uniqueFileName);
        await File.WriteAllBytesAsync(filePath, fileData);

        return $"/uploads/{folder}/{uniqueFileName}";
    }
}
