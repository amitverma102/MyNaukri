using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Auth;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

using Microsoft.AspNetCore.RateLimiting;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("AuthRateLimit")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtProvider _jwtProvider;
    private readonly IPasswordHasher _passwordHasher;
    private readonly INotificationService _notificationService;
    private readonly IStorageService _storageService;

    public AuthController(
        ApplicationDbContext context, 
        IJwtProvider jwtProvider, 
        IPasswordHasher passwordHasher,
        INotificationService notificationService,
        IStorageService storageService)
    {
        _context = context;
        _jwtProvider = jwtProvider;
        _passwordHasher = passwordHasher;
        _notificationService = notificationService;
        _storageService = storageService;
    }

    private static string GenerateOtp()
    {
        return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto request)
    {
        var emailLower = request.Email.ToLower();
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailLower))
        {
            return BadRequest("Email already exists.");
        }

        if (request.Role != Role.Candidate)
        {
            return BadRequest("Public registration is only allowed for Candidates. Please contact an Administrator to create Recruiter or Institute Administrator accounts.");
        }

        var otp = GenerateOtp();
        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = request.Role,
            IsEmailVerified = false,
            VerificationOtp = otp,
            VerificationOtpExpiry = DateTime.UtcNow.AddMinutes(15)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        if (user.Role == Role.Candidate)
        {
            var candidate = new Candidate 
            { 
                UserId = user.Id,
                IsSubscribedToJobAlerts = true
            };
            _context.Candidates.Add(candidate);
            await _context.SaveChangesAsync();
        }

        var verificationEmailHtml = BuildVerificationOtpEmailHtml(
            recipientName: $"{user.FirstName} {user.LastName}".Trim(),
            otp: otp,
            expiryMinutes: 15
        );

        await _notificationService.SendEmailAsync(
            user.Email,
            "Verify your EduKey360 Account",
            verificationEmailHtml,
            emailType: MyNaukri.Domain.Enums.EmailType.Verification
        );

        return Ok(new AuthResponseDto { Message = "User registered. Please verify your email." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        var emailLower = request.Email.ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
        
        if (user == null)
        {
            return Unauthorized("Invalid email or password.");
        }

        // Check if user is temporarily locked out
        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remainingMinutes = Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
            return StatusCode(429, $"Account is temporarily locked due to multiple failed login attempts. Please try again in {remainingMinutes} minutes.");
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                user.FailedLoginAttempts = 0;
                await _context.SaveChangesAsync();
                return StatusCode(429, "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.");
            }

            await _context.SaveChangesAsync();
            return Unauthorized($"Invalid email or password. You have {5 - user.FailedLoginAttempts} attempts remaining before temporary lockout.");
        }

        if (!user.IsEmailVerified)
        {
            return StatusCode(403, "Email not verified. Please verify your email first.");
        }

        if (!user.IsActive)
        {
            return Unauthorized("User is inactive or deleted.");
        }

        // Reset failed login attempts upon successful authentication
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        user.CurrentSessionId = Guid.NewGuid();
        await _context.SaveChangesAsync();

        var token = _jwtProvider.Generate(user, user.CurrentSessionId);

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var displayName = !string.IsNullOrWhiteSpace(fullName) ? fullName : (user.Email.Contains('@') ? user.Email.Split('@')[0] : user.Email);

        return Ok(new AuthResponseDto 
        { 
            Token = token, 
            Message = "Login successful.",
            UserName = displayName,
            Role = user.Role.ToString(),
            ProfilePictureUrl = user.ProfilePictureUrl
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive) return Unauthorized();

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var displayName = !string.IsNullOrWhiteSpace(fullName) ? fullName : (user.Email.Contains('@') ? user.Email.Split('@')[0] : user.Email);

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            FullName = fullName,
            DisplayName = displayName,
            Role = user.Role.ToString(),
            user.ProfilePictureUrl
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.FirstName))
        {
            return BadRequest("First name is required.");
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName?.Trim() ?? string.Empty;

        await _context.SaveChangesAsync();

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var displayName = !string.IsNullOrWhiteSpace(fullName) ? fullName : (user.Email.Contains('@') ? user.Email.Split('@')[0] : user.Email);

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            FullName = fullName,
            DisplayName = displayName,
            Role = user.Role.ToString(),
            user.ProfilePictureUrl
        });
    }

    [HttpPost("profile-picture")]
    [Authorize]
    public async Task<IActionResult> UploadProfilePicture([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Please provide an image file.");
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest("Image size must be 5MB or less.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg" };
        if (!allowed.Contains(ext))
        {
            return BadRequest("Invalid image format. Allowed formats are JPG, JPEG, PNG, WEBP, GIF, SVG.");
        }

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive) return Unauthorized();

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var fileBytes = ms.ToArray();

        var pictureUrl = await _storageService.UploadImageAsync(fileBytes, file.FileName, "profiles");
        user.ProfilePictureUrl = pictureUrl;

        // If candidate, keep candidate record synchronized
        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate != null)
        {
            candidate.ProfilePictureUrl = pictureUrl;
        }

        await _context.SaveChangesAsync();

        return Ok(new { ProfilePictureUrl = pictureUrl, Message = "Profile picture updated successfully." });
    }

    [HttpDelete("profile-picture")]
    [Authorize]
    public async Task<IActionResult> DeleteProfilePicture()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive) return Unauthorized();

        user.ProfilePictureUrl = string.Empty;

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate != null)
        {
            candidate.ProfilePictureUrl = string.Empty;
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Profile picture removed successfully." });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto request)
    {
        var emailLower = request.Email.ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
        if (user == null) return NotFound("User not found.");

        if (user.IsEmailVerified) return BadRequest("Email is already verified.");

        if (user.VerificationOtp != request.Otp || user.VerificationOtpExpiry < DateTime.UtcNow)
        {
            user.FailedOtpAttempts++;
            if (user.FailedOtpAttempts >= 3)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                return BadRequest("Invalid or expired OTP. Too many failed attempts. Account creation has been abandoned. Please register again.");
            }
            
            await _context.SaveChangesAsync();
            return BadRequest($"Invalid or expired OTP. You have {3 - user.FailedOtpAttempts} attempts remaining.");
        }

        user.IsEmailVerified = true;
        user.VerificationOtp = null;
        user.VerificationOtpExpiry = null;
        await _context.SaveChangesAsync();

        if (user.Role == Role.Candidate)
        {
            var welcomeHtml = BuildWelcomeCandidateEmailHtml(user.FirstName);
            await _notificationService.SendEmailAsync(
                user.Email,
                "Welcome to EduKey360!",
                welcomeHtml,
                emailType: MyNaukri.Domain.Enums.EmailType.Default
            );
        }

        return Ok(new { Message = "Email verified successfully." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
    {
        var emailLower = request.Email.ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
        if (user == null) 
        {
            // Do not reveal that user doesn't exist
            return Ok(new { Message = "If that email is in our system, we have sent a reset code." });
        }

        var otp = GenerateOtp();
        user.ResetPasswordOtp = otp;
        user.ResetPasswordExpiry = DateTime.UtcNow.AddMinutes(15);
        await _context.SaveChangesAsync();

        var resetEmailHtml = BuildPasswordResetOtpEmailHtml(
            recipientName: $"{user.FirstName} {user.LastName}".Trim(),
            otp: otp,
            expiryMinutes: 15
        );

        await _notificationService.SendEmailAsync(
            user.Email,
            "EduKey360 - Password Reset Request",
            resetEmailHtml,
            emailType: MyNaukri.Domain.Enums.EmailType.Verification
        );

        return Ok(new { Message = "If that email is in our system, we have sent a reset code." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
    {
        var emailLower = request.Email.ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
        if (user == null) return BadRequest("Invalid request.");

        if (user.ResetPasswordOtp != request.Otp || user.ResetPasswordExpiry < DateTime.UtcNow)
        {
            return BadRequest("Invalid or expired reset code.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.ResetPasswordOtp = null;
        user.ResetPasswordExpiry = null;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Password reset successfully." });
    }

    /// <summary>
    /// Self-serve account deletion required by Apple App Store and Google Play guidelines, and India DPDP Act.
    /// Anonymizes user identifiers and revokes active sessions and push tokens.
    /// </summary>
    [HttpDelete("account")]
    [Authorize]
    public async Task<IActionResult> DeleteAccount()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound("User not found.");

        user.IsActive = false;
        user.CurrentSessionId = null;
        user.DeletedAt = DateTime.UtcNow;
        user.Email = $"deleted_{user.Id}@anonymized.local";
        user.FirstName = "Deleted";
        user.LastName = "Account";

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate != null)
        {
            candidate.PhoneNumber = "";
            candidate.ResumeUrl = "";
            candidate.Summary = "";
            candidate.DemoVideoUrl = "";
            candidate.DemoVideoSummary = "";
        }

        var deviceTokens = await _context.DeviceTokens.Where(d => d.UserId == userId).ToListAsync();
        _context.DeviceTokens.RemoveRange(deviceTokens);

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Account successfully deleted and personal data anonymized." });
    }

    private static string BuildVerificationOtpEmailHtml(string recipientName, string otp, int expiryMinutes)
    {
        var name = string.IsNullOrWhiteSpace(recipientName) ? "Valued Educator" : recipientName;
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Verify Your EduKey360 Account</title>
</head>
<body style=""margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f1f5f9;padding:32px 16px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:580px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);"">
                    <tr>
                        <td style=""background:linear-gradient(135deg, #0f766e 0%, #115e59 100%);padding:28px 32px;text-align:center;"">
                            <h1 style=""margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;"">EduKey360</h1>
                            <p style=""margin:4px 0 0 0;color:#99f6e4;font-size:13px;font-weight:500;"">Educational Careers &amp; Institutional Hiring</p>
                        </td>
                    </tr>
                    <tr>
                        <td style=""padding:32px;"">
                            <h2 style=""margin:0 0 12px 0;color:#0f172a;font-size:18px;font-weight:600;"">Verify your email address</h2>
                            <p style=""margin:0 0 16px 0;color:#475569;font-size:14px;line-height:1.6;"">Hello {System.Net.WebUtility.HtmlEncode(name)},</p>
                            <p style=""margin:0 0 24px 0;color:#475569;font-size:14px;line-height:1.6;"">Thank you for registering with EduKey360. Please use the following one-time verification code to activate your account:</p>
                            
                            <div style=""text-align:center;margin:28px 0;padding:20px;background-color:#f8fafc;border:2px dashed #0f766e;border-radius:10px;"">
                                <div style=""font-size:32px;font-weight:800;letter-spacing:8px;color:#0f766e;font-family:Consolas, Monaco, monospace;"">{otp}</div>
                                <div style=""margin-top:8px;font-size:12px;color:#64748b;"">Valid for {expiryMinutes} minutes</div>
                            </div>

                            <p style=""margin:0 0 12px 0;color:#64748b;font-size:13px;line-height:1.5;"">
                                <strong>Security notice:</strong> Do not share this code with anyone. EduKey360 representatives will never ask you for your verification code.
                            </p>
                            <p style=""margin:0;color:#64748b;font-size:13px;line-height:1.5;"">
                                If you did not create an account on EduKey360, you can safely disregard this message.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style=""background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;"">
                            <p style=""margin:0;font-weight:600;color:#64748b;"">EduKey360 — India's Premier Educational Careers Network</p>
                            <p style=""margin:4px 0 0 0;"">Connecting talented educators and leadership professionals with premier educational institutions.</p>
                            <p style=""margin:8px 0 0 0;"">Support: <a href=""mailto:support@edukey360.com"" style=""color:#0f766e;text-decoration:none;"">support@edukey360.com</a> &bull; <a href=""https://edukey360.com"" style=""color:#0f766e;text-decoration:none;"">www.edukey360.com</a></p>
                            <p style=""margin:8px 0 0 0;font-size:11px;color:#cbd5e1;"">You received this email because an account creation was initiated with this address.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }

    private static string BuildPasswordResetOtpEmailHtml(string recipientName, string otp, int expiryMinutes)
    {
        var name = string.IsNullOrWhiteSpace(recipientName) ? "Valued User" : recipientName;
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>EduKey360 Password Reset</title>
</head>
<body style=""margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f1f5f9;padding:32px 16px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:580px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);"">
                    <tr>
                        <td style=""background:linear-gradient(135deg, #0f766e 0%, #115e59 100%);padding:28px 32px;text-align:center;"">
                            <h1 style=""margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;"">EduKey360</h1>
                            <p style=""margin:4px 0 0 0;color:#99f6e4;font-size:13px;font-weight:500;"">Educational Careers &amp; Institutional Hiring</p>
                        </td>
                    </tr>
                    <tr>
                        <td style=""padding:32px;"">
                            <h2 style=""margin:0 0 12px 0;color:#0f172a;font-size:18px;font-weight:600;"">Password Reset Request</h2>
                            <p style=""margin:0 0 16px 0;color:#475569;font-size:14px;line-height:1.6;"">Hello {System.Net.WebUtility.HtmlEncode(name)},</p>
                            <p style=""margin:0 0 24px 0;color:#475569;font-size:14px;line-height:1.6;"">We received a request to reset your password. Use the verification code below to complete the password reset process:</p>
                            
                            <div style=""text-align:center;margin:28px 0;padding:20px;background-color:#f8fafc;border:2px dashed #0f766e;border-radius:10px;"">
                                <div style=""font-size:32px;font-weight:800;letter-spacing:8px;color:#0f766e;font-family:Consolas, Monaco, monospace;"">{otp}</div>
                                <div style=""margin-top:8px;font-size:12px;color:#64748b;"">Expires in {expiryMinutes} minutes</div>
                            </div>

                            <p style=""margin:0 0 12px 0;color:#64748b;font-size:13px;line-height:1.5;"">
                                <strong>Security reminder:</strong> If you did not request this password reset, your account is still secure — no changes have been made. You can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style=""background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;"">
                            <p style=""margin:0;font-weight:600;color:#64748b;"">EduKey360 — India's Premier Educational Careers Network</p>
                            <p style=""margin:4px 0 0 0;"">Connecting talented educators and leadership professionals with premier educational institutions.</p>
                            <p style=""margin:8px 0 0 0;"">Support: <a href=""mailto:support@edukey360.com"" style=""color:#0f766e;text-decoration:none;"">support@edukey360.com</a> &bull; <a href=""https://edukey360.com"" style=""color:#0f766e;text-decoration:none;"">www.edukey360.com</a></p>
                            <p style=""margin:8px 0 0 0;font-size:11px;color:#cbd5e1;"">You received this security notification because a password reset was requested for your account.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }

    private static string BuildWelcomeCandidateEmailHtml(string firstName)
    {
        var name = string.IsNullOrWhiteSpace(firstName) ? "Educator" : firstName;
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Welcome to EduKey360!</title>
</head>
<body style=""margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f1f5f9;padding:32px 16px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:580px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);"">
                    <tr>
                        <td style=""background:linear-gradient(135deg, #0f766e 0%, #115e59 100%);padding:28px 32px;text-align:center;"">
                            <h1 style=""margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;"">EduKey360</h1>
                            <p style=""margin:4px 0 0 0;color:#99f6e4;font-size:13px;font-weight:500;"">Educational Careers &amp; Institutional Hiring</p>
                        </td>
                    </tr>
                    <tr>
                        <td style=""padding:32px;"">
                            <h2 style=""margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;"">Welcome to EduKey360, {System.Net.WebUtility.HtmlEncode(name)}! 🎓</h2>
                            <p style=""margin:0 0 16px 0;color:#475569;font-size:14px;line-height:1.6;"">
                                Your profile has been successfully registered and verified. We connect talented educators, academic leaders, and educational professionals with top schools and institutions across India.
                            </p>

                            <div style=""background-color:#f8fafc;border-left:4px solid #0f766e;border-radius:6px;padding:16px 20px;margin:24px 0;"">
                                <h3 style=""margin:0 0 10px 0;color:#0f172a;font-size:15px;font-weight:600;"">What happens next?</h3>
                                <ul style=""margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.7;"">
                                    <li><strong>Profile Review:</strong> Our recruitment partners review your profile against active institutional openings.</li>
                                    <li><strong>Direct Matching:</strong> When a position matches your qualifications, subjects, and preferred location, you will receive notifications.</li>
                                    <li><strong>Keep Profile Updated:</strong> Adding certifications, boards taught, and demo videos significantly accelerates employer response.</li>
                                </ul>
                            </div>

                            <div style=""text-align:center;margin:32px 0 16px 0;"">
                                <a href=""https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io/candidate/dashboard"" style=""display:inline-block;background-color:#0f766e;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;"">Go to Candidate Dashboard</a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style=""background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;"">
                            <p style=""margin:0;font-weight:600;color:#64748b;"">EduKey360 — India's Premier Educational Careers Network</p>
                            <p style=""margin:4px 0 0 0;"">Connecting talented educators and leadership professionals with premier educational institutions.</p>
                            <p style=""margin:8px 0 0 0;"">Support: <a href=""mailto:support@edukey360.com"" style=""color:#0f766e;text-decoration:none;"">support@edukey360.com</a> &bull; <a href=""https://edukey360.com"" style=""color:#0f766e;text-decoration:none;"">www.edukey360.com</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
}
