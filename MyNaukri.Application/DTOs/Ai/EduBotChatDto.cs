using System;
using System.Collections.Generic;
using MyNaukri.Application.DTOs.Jobs;

namespace MyNaukri.Application.DTOs.Ai;

public class EduBotMessageDto
{
    public string Sender { get; set; } = "user"; // "user" or "edubot"
    public string Content { get; set; } = string.Empty;
}

public class EduBotChatRequestDto
{
    public string Message { get; set; } = string.Empty;
    public List<EduBotMessageDto> History { get; set; } = new();
    public string? UserRole { get; set; }
    public Guid? UserId { get; set; }
}

public class EduBotChatResponseDto
{
    public string Response { get; set; } = string.Empty;
    public bool IsOffTopic { get; set; }
    public List<string> SuggestedPrompts { get; set; } = new();
    public List<JobDto>? MatchingJobs { get; set; }
    public string? ActionType { get; set; }
}
