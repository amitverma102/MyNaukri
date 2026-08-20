using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var activeJobs = await _context.Jobs.CountAsync(j => j.IsActive);
        
        return Ok(new {
            TotalUsers = totalUsers,
            ActiveJobs = activeJobs,
            PendingReports = 0 // Mock for now
        });
    }
}
