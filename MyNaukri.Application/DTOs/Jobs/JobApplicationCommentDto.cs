namespace MyNaukri.Application.DTOs.Jobs;

public class JobApplicationCommentDto
{
    public Guid Id { get; set; }
    public Guid JobApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
