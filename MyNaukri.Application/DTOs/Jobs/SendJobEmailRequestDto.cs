namespace MyNaukri.Application.DTOs.Jobs;

public class SendJobEmailRequestDto
{
    public string? Subject { get; set; }
    public string? CustomMessage { get; set; }
}
