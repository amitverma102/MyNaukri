using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.SuperAdmin;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdministrator")]
public class SuperAdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInstitutionCreditService _institutionCreditService;
    private readonly IPasswordHasher _passwordHasher;

    public SuperAdminController(ApplicationDbContext context, IInstitutionCreditService institutionCreditService, IPasswordHasher passwordHasher)
    {
        _context = context;
        _institutionCreditService = institutionCreditService;
        _passwordHasher = passwordHasher;
    }

    private Guid GetUserId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue("nameid");

        return Guid.TryParse(idClaim, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var stats = new DashboardStatsDto
        {
            TotalInstitutions = await _context.Institutions.CountAsync(),
            ActiveInstitutions = await _context.Institutions.CountAsync(i => i.Status == InstitutionStatus.Active),
            
            TotalCreditsPurchased = await _context.InstitutionCreditWallets.SumAsync(w => (int?)w.TotalPurchasedCredits) ?? 0,
            TotalCreditsRemaining = await _context.InstitutionCreditWallets.SumAsync(w => (int?)w.AvailableCredits) ?? 0,
            
            // For TotalCreditsIssued, we count the credits issued by SuperAdmins.
            TotalCreditsIssued = await _context.CreditTransactions
                .Where(t => t.TransactionType == TransactionType.SuperAdminCreditAllocation)
                .SumAsync(t => (int?)t.Credits) ?? 0
        };

        // TotalCreditsConsumed: For simplicity, it's total purchased + total issued - total remaining.
        stats.TotalCreditsConsumed = (stats.TotalCreditsPurchased + stats.TotalCreditsIssued) - stats.TotalCreditsRemaining;

        return Ok(stats);
    }

    [HttpPost("institutions")]
    public async Task<IActionResult> CreateInstitution([FromBody] CreateInstitutionDto request)
    {
        var currentUserId = GetUserId();
        if (currentUserId == Guid.Empty)
        {
            return Unauthorized("Your session is invalid. Please log in again.");
        }

        if (await _context.Institutions.AnyAsync(i => i.Code == request.Code))
        {
            return BadRequest("Institution code must be unique.");
        }

        if (await _context.Users.AnyAsync(u => u.Email == request.AdminEmail))
        {
            return BadRequest("Admin email is already in use.");
        }

        var institution = new Institution
        {
            Name = request.Name,
            Code = request.Code,
            Type = request.Type,
            MaxRecruiters = request.MaxRecruiters,
            Address = request.Address ?? string.Empty,
            City = request.City ?? string.Empty,
            State = request.State ?? string.Empty,
            PINCode = request.PINCode ?? string.Empty,
            Email = request.Email ?? string.Empty,
            Phone = request.Phone ?? string.Empty,
            Website = request.Website ?? string.Empty,
            Status = InstitutionStatus.Active
        };

        _context.Institutions.Add(institution);
        
        var adminUser = new User
        {
            FirstName = request.AdminFirstName,
            LastName = request.AdminLastName,
            Email = request.AdminEmail,
            PasswordHash = _passwordHasher.Hash(request.AdminPassword),
            Role = Role.InstituteAdministrator
        };
        _context.Users.Add(adminUser);

        var adminProfile = new InstituteAdminProfile
        {
            User = adminUser,
            Institution = institution
        };
        _context.InstituteAdminProfiles.Add(adminProfile);
        
        // Log Audit
        _context.AuditLogs.Add(new AuditLog
        {
            Action = "CREATE_INSTITUTION",
            PerformedByUserId = currentUserId,
            Role = Role.SuperAdministrator,
            Details = System.Text.Json.JsonSerializer.Serialize(request)
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            institution.Id,
            institution.Name,
            institution.Code,
            institution.Type,
            institution.Status,
            createdDate = institution.CreatedAt
        });
    }

    [HttpGet("institutions")]
    public async Task<IActionResult> GetInstitutions([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        
        var query = _context.Institutions
            .Include(i => i.CreditWallet)
            .AsNoTracking();

        var totalRecords = await query.CountAsync();
        
        var institutions = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new InstitutionListDto
            {
                Id = i.Id,
                Name = i.Name,
                Code = i.Code,
                Type = i.Type,
                City = i.City,
                State = i.State,
                Status = i.Status,
                MaxRecruiters = i.MaxRecruiters,
                CreditBalance = i.CreditWallet != null ? i.CreditWallet.AvailableCredits : 0,
                CreatedDate = i.CreatedAt
            })
            .ToListAsync();

        return Ok(new PaginatedResultDto<InstitutionListDto>
        {
            Items = institutions,
            Page = page,
            PageSize = pageSize,
            TotalRecords = totalRecords
        });
    }

    [HttpPut("institutions/{id}/max-recruiters")]
    public async Task<IActionResult> UpdateMaxRecruiters(Guid id, [FromBody] UpdateMaxRecruitersDto request)
    {
        var institution = await _context.Institutions.FindAsync(id);
        if (institution == null) return NotFound("Institution not found.");

        institution.MaxRecruiters = request.MaxRecruiters;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Max recruiters updated successfully." });
    }

    [HttpPost("institutions/{institutionId}/credits")]
    public async Task<IActionResult> AddCredits(Guid institutionId, [FromBody] AddCreditsDto request)
    {
        var institution = await _context.Institutions.FindAsync(institutionId);
        if (institution == null) return NotFound("Institution not found.");
        if (institution.Status != InstitutionStatus.Active) return BadRequest("Institution is not active.");

        var userId = GetUserId();

        var transaction = await _institutionCreditService.SuperAdminAddCreditsAsync(institutionId, request.Credits, userId, request.Reason);
        if (transaction == null)
        {
            return StatusCode(500, "Failed to add credits due to a system error.");
        }

        return Ok(new AddCreditsResponseDto
        {
            InstitutionId = institutionId,
            CreditsAdded = transaction.Credits,
            BalanceBefore = transaction.BalanceBefore,
            BalanceAfter = transaction.BalanceAfter,
            TransactionId = $"TXN-{transaction.Id.ToString().Substring(0, 8).ToUpper()}"
        });
    }

    [HttpGet("credit-transactions")]
    public async Task<IActionResult> GetCreditTransactions(
        [FromQuery] Guid? institutionId,
        [FromQuery] Guid? userId,
        [FromQuery] string? search,
        [FromQuery] TransactionType? transactionType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string sortBy = "date",
        [FromQuery] string sortDirection = "desc")
    {
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.CreditTransactions
            .Include(t => t.Institution)
            .Include(t => t.CreatedByUser)
            .AsNoTracking()
            .AsQueryable();

        // Filters
        if (institutionId.HasValue && institutionId.Value != Guid.Empty)
            query = query.Where(t => t.InstitutionId == institutionId.Value);

        if (userId.HasValue && userId.Value != Guid.Empty)
            query = query.Where(t => t.CreatedByUserId == userId.Value);

        if (transactionType.HasValue)
            query = query.Where(t => t.TransactionType == transactionType.Value);

        if (fromDate.HasValue)
            query = query.Where(t => t.CreatedAt >= fromDate.Value.ToUniversalTime());

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.ToUniversalTime().AddDays(1).AddTicks(-1);
            query = query.Where(t => t.CreatedAt <= endOfDay);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(t => 
                t.Id.ToString().ToLower().Contains(searchLower) ||
                t.Institution.Name.ToLower().Contains(searchLower) ||
                t.Institution.Code.ToLower().Contains(searchLower) ||
                (t.CreatedByUser != null && (t.CreatedByUser.FirstName.ToLower().Contains(searchLower) || t.CreatedByUser.LastName.ToLower().Contains(searchLower))) ||
                (t.Description != null && t.Description.ToLower().Contains(searchLower)) ||
                (t.Reason != null && t.Reason.ToLower().Contains(searchLower)) ||
                (t.ReferenceId != null && t.ReferenceId.ToLower().Contains(searchLower))
            );
        }

        var totalRecords = await query.CountAsync();

        // Sorting
        bool isDesc = sortDirection.ToLower() == "desc";
        query = sortBy.ToLower() switch
        {
            "credits" => isDesc ? query.OrderByDescending(t => t.Credits) : query.OrderBy(t => t.Credits),
            "institution" => isDesc ? query.OrderByDescending(t => t.Institution.Name) : query.OrderBy(t => t.Institution.Name),
            "user" => isDesc ? query.OrderByDescending(t => t.CreatedByUser!.FirstName) : query.OrderBy(t => t.CreatedByUser!.FirstName),
            "transactiontype" => isDesc ? query.OrderByDescending(t => t.TransactionType) : query.OrderBy(t => t.TransactionType),
            _ => isDesc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt)
        };

        var transactions = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new CreditTransactionDto
            {
                TransactionId = $"TXN-{t.Id.ToString().Substring(0, 8).ToUpper()}",
                InstitutionId = t.InstitutionId,
                InstitutionName = t.Institution.Name,
                UserId = t.CreatedByUserId,
                UserName = t.CreatedByUser != null ? $"{t.CreatedByUser.FirstName} {t.CreatedByUser.LastName}" : string.Empty,
                TransactionType = t.TransactionType.ToString(),
                Credits = t.Credits,
                BalanceBefore = t.BalanceBefore,
                BalanceAfter = t.BalanceAfter,
                Description = t.Description ?? string.Empty,
                Reason = t.Reason,
                CreatedDate = t.CreatedAt
            })
            .ToListAsync();

        return Ok(new PaginatedResultDto<CreditTransactionDto>
        {
            Items = transactions,
            Page = page,
            PageSize = pageSize,
            TotalRecords = totalRecords
        });
    }
}
