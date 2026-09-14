using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyNaukri.Application.DTOs.Ai;
using MyNaukri.Application.Interfaces;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EduBotController : ControllerBase
{
    private readonly IAiService _aiService;

    public EduBotController(IAiService aiService)
    {
        _aiService = aiService;
    }

    [HttpPost("chat")]
    [AllowAnonymous]
    public async Task<ActionResult<EduBotChatResponseDto>> Chat([FromBody] EduBotChatRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("Message cannot be empty.");
        }

        // Populate authenticated context if present
        if (User?.Identity?.IsAuthenticated == true)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userIdStr, out var userId))
            {
                request.UserId = userId;
            }

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrWhiteSpace(role))
            {
                request.UserRole = role;
            }
        }

        var response = await _aiService.ChatWithEduBotAsync(request);
        return Ok(response);
    }
}
