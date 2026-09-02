namespace MyNaukri.Application.DTOs.Candidates;

public class ParsedResumeDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public int TotalExperienceYears { get; set; }
    public string CurrentLocation { get; set; } = string.Empty;
    public string ClassesTaught { get; set; } = string.Empty;
    public string BoardsTaught { get; set; } = string.Empty;
    public string Education { get; set; } = string.Empty;
    public string Certifications { get; set; } = string.Empty;
}
