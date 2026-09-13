namespace MyNaukri.Application.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? Role { get; set; }
    public string? ProfilePictureUrl { get; set; }
}
