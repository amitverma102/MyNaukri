using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Role Role { get; set; }
    public bool IsActive { get; set; } = true;
    public string ProfilePictureUrl { get; set; } = string.Empty;

    // Email Verification and OTPs
    public bool IsEmailVerified { get; set; } = true; // Default true for existing users
    public string? VerificationOtp { get; set; }
    public DateTime? VerificationOtpExpiry { get; set; }
    public int FailedOtpAttempts { get; set; } = 0;
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockoutEnd { get; set; }
    public DateTime? DeletedAt { get; set; }
    
    public string? ResetPasswordOtp { get; set; }
    public DateTime? ResetPasswordExpiry { get; set; }

    public Guid? CurrentSessionId { get; set; }

    public ICollection<DeviceToken> DeviceTokens { get; set; } = new List<DeviceToken>();
}
