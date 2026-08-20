using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CandidatesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAiService _aiService;
    private readonly IStorageService _storageService;
    private readonly ICreditService _creditService;
    private readonly ISearchService _searchService;

    public CandidatesController(ApplicationDbContext context, IAiService aiService, IStorageService storageService, ICreditService creditService, ISearchService searchService)
    {
        _context = context;
        _aiService = aiService;
        _storageService = storageService;
        _creditService = creditService;
        _searchService = searchService;
    }

    [HttpGet("profile")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<CandidateProfileDto>> GetProfile()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (candidate == null)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            return Ok(new CandidateProfileDto
            {
                Id = Guid.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                PhoneNumber = "",
                ResumeUrl = "",
                Skills = "",
                Summary = "",
                TotalExperienceYears = 0,
                CurrentSalary = null,
                ExpectedSalary = null,
                NoticePeriod = "",
                CurrentLocation = "",
                PreferredLocations = "",
                ClassesTaught = "",
                BoardsTaught = "",
                Education = "",
                Certifications = ""
            });
        }

        return Ok(new CandidateProfileDto
        {
            Id = candidate.Id,
            FirstName = candidate.User.FirstName,
            LastName = candidate.User.LastName,
            Email = candidate.User.Email,
            PhoneNumber = candidate.PhoneNumber,
            ResumeUrl = candidate.ResumeUrl,
            Skills = candidate.Skills,
            Summary = candidate.Summary,
            TotalExperienceYears = candidate.TotalExperienceYears,
            CurrentSalary = candidate.CurrentSalary,
            ExpectedSalary = candidate.ExpectedSalary,
            NoticePeriod = candidate.NoticePeriod,
            CurrentLocation = candidate.CurrentLocation,
            PreferredLocations = candidate.PreferredLocations,
            ClassesTaught = candidate.ClassesTaught,
            BoardsTaught = candidate.BoardsTaught,
            Education = candidate.Education,
            Certifications = candidate.Certifications
        });
    }

    [HttpPost("profile")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult> UpdateProfile([FromBody] UpdateCandidateProfileDto request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        
        if (candidate == null)
        {
            // Upsert: Create it if it doesn't exist
            candidate = new MyNaukri.Domain.Entities.Candidate
            {
                UserId = userId,
                PhoneNumber = request.PhoneNumber ?? "",
                Skills = request.Skills ?? "",
                Summary = request.Summary ?? "",
                TotalExperienceYears = request.TotalExperienceYears,
                CurrentSalary = request.CurrentSalary,
                ExpectedSalary = request.ExpectedSalary,
                NoticePeriod = request.NoticePeriod ?? "",
                CurrentLocation = request.CurrentLocation ?? "",
                PreferredLocations = request.PreferredLocations ?? "",
                ClassesTaught = request.ClassesTaught ?? "",
                BoardsTaught = request.BoardsTaught ?? "",
                Education = request.Education ?? "",
                Certifications = request.Certifications ?? ""
            };
            _context.Candidates.Add(candidate);
        }
        else
        {
            candidate.PhoneNumber = request.PhoneNumber ?? candidate.PhoneNumber;
            candidate.Skills = request.Skills ?? candidate.Skills;
            candidate.Summary = request.Summary ?? candidate.Summary;
            candidate.TotalExperienceYears = request.TotalExperienceYears;
            candidate.CurrentSalary = request.CurrentSalary ?? candidate.CurrentSalary;
            candidate.ExpectedSalary = request.ExpectedSalary ?? candidate.ExpectedSalary;
            candidate.NoticePeriod = request.NoticePeriod ?? candidate.NoticePeriod;
            candidate.CurrentLocation = request.CurrentLocation ?? candidate.CurrentLocation;
            candidate.PreferredLocations = request.PreferredLocations ?? candidate.PreferredLocations;
            candidate.ClassesTaught = request.ClassesTaught ?? candidate.ClassesTaught;
            candidate.BoardsTaught = request.BoardsTaught ?? candidate.BoardsTaught;
            candidate.Education = request.Education ?? candidate.Education;
            candidate.Certifications = request.Certifications ?? candidate.Certifications;
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Profile updated successfully." });
    }
    [HttpPost("parse-resume")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<string>> ParseResume(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("File is empty");
        
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null)
        {
            candidate = new MyNaukri.Domain.Entities.Candidate
            {
                UserId = userId,
                PhoneNumber = "",
                Skills = "",
                Summary = "",
                TotalExperienceYears = 0
            };
            _context.Candidates.Add(candidate);
            // We must save changes to generate the candidate.Id for the storage service
            await _context.SaveChangesAsync();
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        var fileBytes = memoryStream.ToArray();

        // Save file locally (MVP)
        var fileUrl = await _storageService.UploadResumeAsync(fileBytes, file.FileName, candidate.Id);

        // Extract skills and other info
        var parsedData = await _aiService.ParseResumeAsync(fileBytes, file.FileName);
        
        // Update candidate record
        candidate.ResumeUrl = fileUrl;
        candidate.Skills = string.IsNullOrEmpty(candidate.Skills) ? parsedData.Skills : candidate.Skills;
        candidate.PhoneNumber = string.IsNullOrEmpty(candidate.PhoneNumber) ? parsedData.PhoneNumber : candidate.PhoneNumber;
        candidate.TotalExperienceYears = candidate.TotalExperienceYears == 0 ? parsedData.TotalExperienceYears : candidate.TotalExperienceYears;
        candidate.CurrentLocation = string.IsNullOrEmpty(candidate.CurrentLocation) ? parsedData.CurrentLocation : candidate.CurrentLocation;
        candidate.ClassesTaught = string.IsNullOrEmpty(candidate.ClassesTaught) ? parsedData.ClassesTaught : candidate.ClassesTaught;
        candidate.BoardsTaught = string.IsNullOrEmpty(candidate.BoardsTaught) ? parsedData.BoardsTaught : candidate.BoardsTaught;
        candidate.Education = string.IsNullOrEmpty(candidate.Education) ? parsedData.Education : candidate.Education;
        candidate.Certifications = string.IsNullOrEmpty(candidate.Certifications) ? parsedData.Certifications : candidate.Certifications;

        await _context.SaveChangesAsync();
        
        return Ok(new 
        { 
            Skills = parsedData.Skills, 
            PhoneNumber = parsedData.PhoneNumber,
            TotalExperienceYears = parsedData.TotalExperienceYears,
            CurrentLocation = parsedData.CurrentLocation,
            ClassesTaught = parsedData.ClassesTaught,
            BoardsTaught = parsedData.BoardsTaught,
            Education = parsedData.Education,
            Certifications = parsedData.Certifications,
            ResumeUrl = fileUrl 
        });
    }

    [HttpGet("{id}/resume/download")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> DownloadResume(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not a recruiter.");

        var candidate = await _context.Candidates.FindAsync(id);
        if (candidate == null) return NotFound("Candidate not found.");

        var rates = await _creditService.GetRatesAsync(recruiter.Id);
        int requiredCredits = rates.ResumeDownloadRate ?? 5;
        var balance = await _creditService.GetBalanceAsync(recruiter.Id);

        if (balance < requiredCredits)
        {
            return StatusCode(402, new { code = "INSUFFICIENT_CREDITS", message = "Insufficient credits.", requiredCredits, availableCredits = balance, shortfall = requiredCredits - balance });
        }

        var deductionSuccess = await _creditService.DeductCreditsAsync(recruiter.Id, requiredCredits, Domain.Enums.TransactionType.ResumeDownload, candidate.Id.ToString(), $"Downloaded resume for candidate {candidate.Id}", userId);
        if (!deductionSuccess) return StatusCode(402, "Failed to deduct credits.");

        return Ok(new { ResumeUrl = candidate.ResumeUrl, CreditsDeducted = requiredCredits, RemainingBalance = balance - requiredCredits });
    }

    [HttpPost("{id}/contact/unlock")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> UnlockContact(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not a recruiter.");

        var candidate = await _context.Candidates.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == id);
        if (candidate == null) return NotFound("Candidate not found.");

        // Check if already unlocked
        var access = await _context.CandidateContactAccesses.FirstOrDefaultAsync(a => a.RecruiterId == recruiter.Id && a.CandidateId == id);
        if (access != null)
        {
            return Ok(new { Email = candidate.User.Email, PhoneNumber = candidate.PhoneNumber, CreditsDeducted = 0 });
        }

        var rates = await _creditService.GetRatesAsync(recruiter.Id);
        int requiredCredits = rates.ContactViewRate ?? 2;
        var balance = await _creditService.GetBalanceAsync(recruiter.Id);

        if (balance < requiredCredits)
        {
            return StatusCode(402, new { code = "INSUFFICIENT_CREDITS", message = "Insufficient credits.", requiredCredits, availableCredits = balance, shortfall = requiredCredits - balance });
        }

        var deductionSuccess = await _creditService.DeductCreditsAsync(recruiter.Id, requiredCredits, Domain.Enums.TransactionType.ContactView, candidate.Id.ToString(), $"Viewed contact for candidate {candidate.Id}", userId);
        if (!deductionSuccess) return StatusCode(402, "Failed to deduct credits.");

        _context.CandidateContactAccesses.Add(new MyNaukri.Domain.Entities.CandidateContactAccess
        {
            RecruiterId = recruiter.Id,
            CandidateId = id,
            CreditsCharged = requiredCredits
        });
        await _context.SaveChangesAsync();

        return Ok(new { Email = candidate.User.Email, PhoneNumber = candidate.PhoneNumber, CreditsDeducted = requiredCredits, RemainingBalance = balance - requiredCredits });
    }

    [HttpPost("bulk-download")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> BulkDownload([FromBody] List<Guid> candidateIds)
    {
        if (candidateIds == null || !candidateIds.Any()) return BadRequest("No candidates specified.");

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not a recruiter.");

        var rates = await _creditService.GetRatesAsync(recruiter.Id);
        int ratePerProfile = rates.BulkProfileDownloadRate ?? 2;
        int requiredCredits = candidateIds.Count * ratePerProfile;
        
        var balance = await _creditService.GetBalanceAsync(recruiter.Id);
        if (balance < requiredCredits)
        {
            return StatusCode(402, new { code = "INSUFFICIENT_CREDITS", message = "Insufficient credits.", requiredCredits, availableCredits = balance, shortfall = requiredCredits - balance });
        }

        var deductionSuccess = await _creditService.DeductCreditsAsync(recruiter.Id, requiredCredits, Domain.Enums.TransactionType.BulkProfileDownload, null, $"Bulk downloaded {candidateIds.Count} profiles", userId);
        if (!deductionSuccess) return StatusCode(402, "Failed to deduct credits.");

        var candidates = await _context.Candidates.Where(c => candidateIds.Contains(c.Id)).Select(c => new { c.Id, c.ResumeUrl }).ToListAsync();
        return Ok(new { Candidates = candidates, CreditsDeducted = requiredCredits, RemainingBalance = balance - requiredCredits });
    }

    [HttpPost("{id}/email")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult> EmailCandidate(Guid id, [FromBody] string message)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not a recruiter.");

        var candidate = await _context.Candidates.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == id);
        if (candidate == null) return NotFound("Candidate not found.");

        var rates = await _creditService.GetRatesAsync(recruiter.Id);
        int requiredCredits = rates.CandidateEmailRate ?? 3;
        
        var balance = await _creditService.GetBalanceAsync(recruiter.Id);
        if (balance < requiredCredits)
        {
            return StatusCode(402, new { code = "INSUFFICIENT_CREDITS", message = "Insufficient credits.", requiredCredits, availableCredits = balance, shortfall = requiredCredits - balance });
        }

        var deductionSuccess = await _creditService.DeductCreditsAsync(recruiter.Id, requiredCredits, Domain.Enums.TransactionType.CandidateEmail, candidate.Id.ToString(), $"Emailed candidate {candidate.Id}", userId);
        if (!deductionSuccess) return StatusCode(402, "Failed to deduct credits.");

        // Simulate sending email (would normally use an IEmailService)
        // If email sending failed, we should refund the credits. For this demo, we assume success.

        return Ok(new { Success = true, CreditsDeducted = requiredCredits, RemainingBalance = balance - requiredCredits });
    }

    [HttpGet("search")]
    [Authorize(Roles = "Recruiter,CompanyHR,SchoolAdministrator,SuperAdministrator")]
    public async Task<ActionResult<IEnumerable<CandidateSearchResultDto>>> SearchCandidates([FromQuery] CandidateSearchRequestDto request)
    {
        var candidates = await _searchService.SearchCandidatesAsync(request);
        return Ok(candidates);
    }
}
