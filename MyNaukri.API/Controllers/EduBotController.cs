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

        // Securely populate authenticated context strictly from claims to prevent spoofing
        if (User?.Identity?.IsAuthenticated == true)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userIdStr, out var userId))
            {
                request.UserId = userId;
            }
            else
            {
                request.UserId = null;
            }

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            request.UserRole = !string.IsNullOrWhiteSpace(role) ? role : null;
        }
        else
        {
            // Anonymous / non-authenticated visitor
            request.UserId = null;
            request.UserRole = null;
        }

        var response = await _aiService.ChatWithEduBotAsync(request);
        return Ok(response);
    }
}
