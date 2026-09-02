using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        public class DeviceTokenRequest
        {
            public string Token { get; set; } = string.Empty;
            public string Platform { get; set; } = string.Empty;
        }

        [HttpPost("device-token")]
        public async Task<IActionResult> RegisterDeviceToken([FromBody] DeviceTokenRequest request)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            // Remove existing token if another user had it, or update it
            var existingToken = await _context.DeviceTokens.FirstOrDefaultAsync(t => t.Token == request.Token);
            if (existingToken != null)
            {
                if (existingToken.UserId != userId)
                {
                    // Token is now bound to a new user
                    _context.DeviceTokens.Remove(existingToken);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    existingToken.LastUsedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return Ok(new { Message = "Device token updated" });
                }
            }

            var newToken = new DeviceToken
            {
                UserId = userId,
                Token = request.Token,
                Platform = request.Platform
            };

            _context.DeviceTokens.Add(newToken);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Device token registered" });
        }

        [HttpDelete("device-token")]
        public async Task<IActionResult> UnregisterDeviceToken([FromQuery] string token)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var existingToken = await _context.DeviceTokens
                .FirstOrDefaultAsync(t => t.Token == token && t.UserId == userId);
                
            if (existingToken != null)
            {
                _context.DeviceTokens.Remove(existingToken);
                await _context.SaveChangesAsync();
            }

            return Ok(new { Message = "Device token unregistered" });
        }
    }
}
