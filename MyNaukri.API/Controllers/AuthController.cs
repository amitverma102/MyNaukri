using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Auth;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtProvider _jwtProvider;
    private readonly IPasswordHasher _passwordHasher;
    private readonly INotificationService _notificationService;

    public AuthController(
        ApplicationDbContext context, 
        IJwtProvider jwtProvider, 
        IPasswordHasher passwordHasher,
        INotificationService notificationService)
    {
        _context = context;
        _jwtProvider = jwtProvider;
        _passwordHasher = passwordHasher;
        _notificationService = notificationService;
    }

    private string GenerateOtp()
    {
        return new Random().Next(100000, 999999).ToString();
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto request)
    {
        var emailLower = request.Email.ToLower();
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailLower))
        {
            return BadRequest("Email already exists.");
        }

        if (request.Role == Role.Recruiter)
        {
            return BadRequest("Public recruiter registration is disabled. Please contact your School Administrator.");
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
            var candidate = new Candidate { UserId = user.Id };
            _context.Candidates.Add(candidate);
            await _context.SaveChangesAsync();
        }

        await _notificationService.SendEmailAsync(
            user.Email,
            "Verify your Edu360 Account",
            $"Your verification code is: {otp}\nThis code will expire in 15 minutes."
        );

        return Ok(new AuthResponseDto { Message = "User registered. Please verify your email." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        var emailLower = request.Email.ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
        
        if (user == null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid email or password.");
        }

        if (!user.IsEmailVerified)
        {
            return StatusCode(403, "Email not verified. Please verify your email first.");
        }

        if (!user.IsActive)
        {
            return Unauthorized("User is inactive.");
        }

        var token = _jwtProvider.Generate(user);

        return Ok(new AuthResponseDto { Token = token, Message = "Login successful." });
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
            return BadRequest("Invalid or expired OTP.");
        }

        user.IsEmailVerified = true;
        user.VerificationOtp = null;
        user.VerificationOtpExpiry = null;
        await _context.SaveChangesAsync();

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

        await _notificationService.SendEmailAsync(
            user.Email,
            "Reset your Edu360 Password",
            $"Your password reset code is: {otp}\nThis code will expire in 15 minutes."
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
}
