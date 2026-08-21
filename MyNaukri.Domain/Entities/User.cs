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

    // Email Verification and OTPs
    public bool IsEmailVerified { get; set; } = true; // Default true for existing users
    public string? VerificationOtp { get; set; }
    public DateTime? VerificationOtpExpiry { get; set; }
    
    public string? ResetPasswordOtp { get; set; }
    public DateTime? ResetPasswordExpiry { get; set; }

    public Guid? CurrentSessionId { get; set; }
}
