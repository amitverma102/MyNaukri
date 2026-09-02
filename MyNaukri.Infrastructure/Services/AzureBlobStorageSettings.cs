namespace MyNaukri.Infrastructure.Services;

public class AzureBlobStorageSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = "resumes";
}
