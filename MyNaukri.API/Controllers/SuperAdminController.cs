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
    private readonly IStorageService _storageService;
    private readonly IResumeProcessingQueue _resumeQueue;

    public SuperAdminController(
        ApplicationDbContext context, 
        IInstitutionCreditService institutionCreditService, 
        IPasswordHasher passwordHasher,
        IStorageService storageService,
        IResumeProcessingQueue resumeQueue)
    {
        _context = context;
        _institutionCreditService = institutionCreditService;
        _passwordHasher = passwordHasher;
        _storageService = storageService;
        _resumeQueue = resumeQueue;
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
        var walletRemaining = await _context.InstitutionCreditWallets.SumAsync(w => (int?)w.AvailableCredits) ?? 0;
        var recruiterRemaining = await _context.Recruiters.SumAsync(r => (int?)r.Credits) ?? 0;

        var stats = new DashboardStatsDto
        {
            TotalInstitutions = await _context.Institutions.CountAsync(),
            ActiveInstitutions = await _context.Institutions.CountAsync(i => i.Status == InstitutionStatus.Active),
            
            TotalCreditsPurchased = await _context.InstitutionCreditWallets.SumAsync(w => (int?)w.TotalPurchasedCredits) ?? 0,
            TotalCreditsRemaining = walletRemaining + recruiterRemaining,
            
            // For TotalCreditsIssued, we count the credits issued by SuperAdmins.
            TotalCreditsIssued = await _context.CreditTransactions
                .Where(t => t.TransactionType == TransactionType.SuperAdminCreditAllocation)
                .SumAsync(t => (int?)t.Credits) ?? 0
        };

        var consumptionTypes = new[] 
        {
            TransactionType.RecruiterResumeDownload,
            TransactionType.RecruiterContactView,
            TransactionType.RecruiterBulkDownload,
            TransactionType.RecruiterNormalJobPosting,
            TransactionType.RecruiterPlatinumJobPosting,
            TransactionType.RecruiterCandidateEmail
        };

        var rawConsumed = await _context.CreditTransactions
            .Where(t => consumptionTypes.Contains(t.TransactionType))
            .SumAsync(t => (int?)t.Credits) ?? 0;
            
        stats.TotalCreditsConsumed = Math.Abs(rawConsumed);

        return Ok(stats);
    }

    [HttpPost("candidates/upload-resume")]
    public async Task<IActionResult> UploadResume(IFormFile file)
    {
        var currentUserId = GetUserId();
        if (currentUserId == Guid.Empty) return Unauthorized("Invalid session.");

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf" && ext != ".doc" && ext != ".docx")
            return BadRequest("Only PDF, DOC, and DOCX files are allowed.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("File size cannot exceed 5MB.");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var fileBytes = ms.ToArray();

        // Save file (using Guid.Empty for candidateId since we don't know it yet)
        var storagePath = await _storageService.UploadResumeAsync(fileBytes, file.FileName, Guid.Empty);

        var resume = new Resume
        {
            OriginalFileName = file.FileName,
            StoredFileName = Path.GetFileName(storagePath),
            ContentType = file.ContentType,
            FileSize = file.Length,
            StorageProvider = "LocalMock",
            StoragePath = storagePath,
            UploadedBy = currentUserId,
            ParsingStatus = ParsingStatus.UPLOADED,
            IsPrimary = false
        };

        _context.Resumes.Add(resume);
        
        var audit = new AuditLog
        {
            Action = "SUPERADMIN_UPLOAD_RESUME",
            Details = $"SuperAdmin uploaded resume {file.FileName}",
            PerformedByUserId = currentUserId,
            Role = Role.SuperAdministrator
        };
        _context.AuditLogs.Add(audit);

        await _context.SaveChangesAsync();

        // Queue for background processing
        await _resumeQueue.QueueResumeAsync(resume.Id);

        return Ok(new { ResumeId = resume.Id, Status = resume.ParsingStatus.ToString(), Message = "Resume uploaded and queued for processing." });
    }

    [HttpGet("candidates/resume-upload/{resumeId}/status")]
    public async Task<IActionResult> GetResumeUploadStatus(Guid resumeId)
    {
        var resume = await _context.Resumes
            .Include(r => r.Candidate)
            .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(r => r.Id == resumeId);

        if (resume == null) return NotFound();

        var response = new 
        {
            resume.Id,
            resume.OriginalFileName,
            Status = resume.ParsingStatus.ToString(),
            CandidateId = resume.CandidateId,
            CandidateEmail = resume.Candidate?.User?.Email,
            CandidateName = resume.Candidate?.User?.FirstName + " " + resume.Candidate?.User?.LastName
        };

        return Ok(response);
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
            LogoUrl = request.LogoUrl ?? string.Empty,
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
            institution.LogoUrl,
            institution.Status,
            createdDate = institution.CreatedAt
        });
    }

    [HttpPost("institutions/{id}/logo")]
    public async Task<IActionResult> UploadInstitutionLogo(Guid id, [FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("Please provide a logo file.");
        if (file.Length > 5 * 1024 * 1024) return BadRequest("Image size must be 5MB or less.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg" };
        if (!allowed.Contains(ext)) return BadRequest("Invalid image format. Allowed formats are JPG, JPEG, PNG, WEBP, GIF, SVG.");

        var institution = await _context.Institutions.FindAsync(id);
        if (institution == null) return NotFound("Institution not found.");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var fileBytes = ms.ToArray();

        var logoUrl = await _storageService.UploadImageAsync(fileBytes, file.FileName, "logos");
        institution.LogoUrl = logoUrl;
        await _context.SaveChangesAsync();

        return Ok(new { LogoUrl = logoUrl, Message = "Institution logo updated successfully." });
    }

    [HttpPost("institutions/upload-logo")]
    public async Task<IActionResult> UploadTempLogo([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("Please provide a logo file.");
        if (file.Length > 5 * 1024 * 1024) return BadRequest("Image size must be 5MB or less.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg" };
        if (!allowed.Contains(ext)) return BadRequest("Invalid image format. Allowed formats are JPG, JPEG, PNG, WEBP, GIF, SVG.");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var fileBytes = ms.ToArray();

        var logoUrl = await _storageService.UploadImageAsync(fileBytes, file.FileName, "logos");

        return Ok(new { LogoUrl = logoUrl, Message = "Logo uploaded successfully." });
    }

    [HttpGet("institutions")]
    public async Task<IActionResult> GetInstitutions([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        
        var query = _context.Institutions
            .Include(i => i.CreditWallet)
            .Include(i => i.Recruiters)
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
                LogoUrl = i.LogoUrl,
                MaxRecruiters = i.MaxRecruiters,
                CreditBalance = (i.CreditWallet != null ? i.CreditWallet.AvailableCredits : 0) + i.Recruiters.Sum(r => r.Credits),
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

        if (!fromDate.HasValue && !toDate.HasValue)
        {
            fromDate = DateTime.UtcNow.AddDays(-7);
            toDate = DateTime.UtcNow;
        }

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
