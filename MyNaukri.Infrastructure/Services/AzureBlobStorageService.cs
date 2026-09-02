using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services;

public class AzureBlobStorageService : IStorageService
{
    private readonly AzureBlobStorageSettings _settings;
    private readonly BlobServiceClient _blobServiceClient;

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
        if (_blobServiceClient == null)
        {
            throw new InvalidOperationException("Azure Blob Storage is not configured properly.");
        }

        var containerClient = _blobServiceClient.GetBlobContainerClient(_settings.ContainerName);
        
        // Ensure container exists
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.BlobContainer);

        var uniqueFileName = $"{candidateId}_{Guid.NewGuid()}_{fileName}";
        var blobClient = containerClient.GetBlobClient(uniqueFileName);

        using var stream = new MemoryStream(fileData);
        await blobClient.UploadAsync(stream, overwrite: true);

        return blobClient.Uri.ToString();
    }
}
