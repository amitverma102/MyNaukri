namespace MyNaukri.Application.DTOs.Recruiters;

public class RecruiterProfileDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
}
