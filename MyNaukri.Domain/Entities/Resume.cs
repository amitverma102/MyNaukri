using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class Resume : BaseEntity
{
    public Guid? CandidateId { get; set; }
    public Candidate? Candidate { get; set; }

    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StorageProvider { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty; // URL or relative path

    public Guid? UploadedBy { get; set; } // Which SuperAdmin/Recruiter uploaded this (if any)
    public User? UploadedByUser { get; set; }

    public ParsingStatus ParsingStatus { get; set; } = ParsingStatus.UPLOADED;
    public string ParsingVersion { get; set; } = "1.0"; // e.g. "Gemini-3.5-flash-v1"
    
    public bool IsPrimary { get; set; }
}
