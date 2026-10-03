using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using System.IO;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAiService _aiService;
    private readonly ISearchService _searchService;
    private readonly ICreditService _creditService;
    private readonly INotificationService? _notificationService;
    private readonly IConfiguration? _configuration;

    public JobsController(
        ApplicationDbContext context, 
        IAiService aiService, 
        ISearchService searchService, 
        ICreditService creditService,
        INotificationService? notificationService = null,
        IConfiguration? configuration = null)
    {
        _context = context;
        _aiService = aiService;
        _searchService = searchService;
        _creditService = creditService;
        _notificationService = notificationService;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<JobDto>>> GetJobs()
    {
        Guid? candidateId = null;
        if (User.Identity?.IsAuthenticated == true && User.IsInRole("Candidate"))
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdStr, out var userId))
            {
                var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
                if (candidate != null) candidateId = candidate.Id;
            }
        }

        var jobs = await _searchService.SearchJobsAsync("", candidateId);

        return Ok(jobs);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<JobDto>> GetJobById(Guid id)
    {
        var job = await _context.Jobs
            .Include(j => j.Institution)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null) return NotFound("Job not found.");

        Guid? candidateId = null;
        if (User.Identity?.IsAuthenticated == true && User.IsInRole("Candidate"))
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdStr, out var userId))
            {
                var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
                if (candidate != null) candidateId = candidate.Id;
            }
        }

        bool isApplied = false;
        if (candidateId.HasValue)
        {
            isApplied = await _context.JobApplications
                .AnyAsync(ja => ja.JobId == id && ja.CandidateId == candidateId.Value);
        }

        var dto = new JobDto
        {
            Id = job.Id,
            Title = job.Title,
            Description = job.Description,
            Requirements = job.Requirements,
            MinSalary = job.MinSalary,
            MaxSalary = job.MaxSalary,
            JobType = job.JobType,
            Location = job.Location,
            RecruiterId = job.RecruiterId,
            InstitutionId = job.InstitutionId,
            CreatedAt = job.CreatedAt,
            IsActive = job.IsActive,
            CompanyName = job.Institution != null ? job.Institution.Name : "Verified Institution",
            Keywords = job.Keywords,
            IsPlatinum = job.IsPlatinum,
            ScreeningQuestionsJson = job.ScreeningQuestionsJson,
            WorkMode = job.WorkMode,
            BoardAffiliation = job.BoardAffiliation,
            SubjectDepartment = job.SubjectDepartment,
            InstitutionLogoUrl = job.Institution != null ? job.Institution.LogoUrl : null,
            IsApplied = isApplied,
            ApprovalStatus = job.ApprovalStatus.ToString(),
            ApprovalComment = job.ApprovalComment,
            ApprovedAt = job.ApprovedAt
        };

        return Ok(dto);
    }

    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    [HttpPost("parse-jd")]
    public async Task<ActionResult<ParsedJobDescriptionDto>> ParseJobDescription(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Please upload a valid Job Description file.");
        }

        var allowedExtensions = new[] { ".pdf", ".docx", ".doc", ".txt" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest("Unsupported file type. Please upload a PDF, Word (.docx, .doc), or text (.txt) document.");
        }

        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest("File size exceeds 10MB limit.");
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        var fileBytes = memoryStream.ToArray();

        var parsed = await _aiService.ParseJobDescriptionAsync(fileBytes, file.FileName);
        return Ok(parsed);
    }

    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    [HttpPost]
    public async Task<ActionResult<JobDto>> CreateJob(JobDto jobDto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        if (!jobDto.IsPlatinum)
        {
            if (jobDto.Description.Length > 250) return BadRequest("Normal job descriptions cannot exceed 250 characters.");
            if (jobDto.Requirements.Length > 250) return BadRequest("Normal job requirements cannot exceed 250 characters.");
        }

        var rates = await _creditService.GetRatesAsync(recruiter.Id);
        int requiredCredits = jobDto.IsPlatinum ? (rates.PlatinumJobPostingRate ?? 40) : (rates.NormalJobPostingRate ?? 20);

        var balance = await _creditService.GetBalanceAsync(recruiter.Id);
        if (balance < requiredCredits)
        {
            return StatusCode(402, new
            {
                code = "INSUFFICIENT_CREDITS",
                message = "Insufficient credits.",
                requiredCredits = requiredCredits,
                availableCredits = balance,
                shortfall = requiredCredits - balance
            });
        }

        var transactionType = jobDto.IsPlatinum ? MyNaukri.Domain.Enums.TransactionType.RecruiterPlatinumJobPosting : MyNaukri.Domain.Enums.TransactionType.RecruiterNormalJobPosting;
        var deductionSuccess = await _creditService.DeductCreditsAsync(recruiter.Id, requiredCredits, transactionType, null, $"Posted {(jobDto.IsPlatinum ? "Platinum" : "Normal")} job", userId);
        
        if (!deductionSuccess)
        {
             return StatusCode(402, "Failed to deduct credits due to concurrency.");
        }

        var institution = await _context.Institutions.FindAsync(recruiter.InstitutionId);
        bool requireApproval = institution?.RequireJobApproval ?? true;

        var job = new Job
        {
            Title = jobDto.Title,
            Description = jobDto.Description,
            Requirements = jobDto.Requirements,
            MinSalary = jobDto.MinSalary,
            MaxSalary = jobDto.MaxSalary,
            JobType = jobDto.JobType,
            Location = jobDto.Location,
            RecruiterId = recruiter.Id,
            InstitutionId = recruiter.InstitutionId,
            Keywords = jobDto.Keywords,
            IsPlatinum = jobDto.IsPlatinum,
            ScreeningQuestionsJson = jobDto.ScreeningQuestionsJson,
            WorkMode = jobDto.WorkMode,
            BoardAffiliation = jobDto.BoardAffiliation,
            SubjectDepartment = jobDto.SubjectDepartment,
            ApprovalStatus = requireApproval ? JobApprovalStatus.Pending : JobApprovalStatus.Approved,
            IsActive = !requireApproval,
            ApprovedAt = !requireApproval ? DateTime.UtcNow : null,
            ApprovedByUserId = !requireApproval ? userId : null
        };

        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();

        jobDto.Id = job.Id;
        jobDto.CreatedAt = job.CreatedAt;
        jobDto.RecruiterId = job.RecruiterId;
        jobDto.InstitutionId = job.InstitutionId;
        jobDto.ApprovalStatus = job.ApprovalStatus.ToString();
        jobDto.IsActive = job.IsActive;

        return CreatedAtAction(nameof(GetJobById), new { id = job.Id }, jobDto);
    }
    [HttpGet("recommendations")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<IEnumerable<JobDto>>> GetRecommendations()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return NotFound("Candidate profile not found.");

        var recommendations = await _aiService.GetJobRecommendationsAsync(candidate.Id);
        
        return Ok(recommendations);
    }

    [HttpGet("{jobId}/ai-match")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<JobResumeComparisonDto>> GetJobAiMatch(Guid jobId)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return NotFound("Candidate profile not found.");

        var comparison = await _aiService.CompareResumeWithJobAsync(candidate.Id, jobId);
        return Ok(comparison);
    }

    [HttpPost("{jobId}/ai-tailor-resume")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<TailoredResumeDto>> TailorResumeForJob(Guid jobId)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null) return NotFound("Candidate profile not found.");

        var tailored = await _aiService.TailorResumeForJobAsync(candidate.Id, jobId);
        return Ok(tailored);
    }
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<JobDto>>> SearchJobs([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest("Search query cannot be empty.");
        }

        Guid? candidateId = null;
        if (User.Identity?.IsAuthenticated == true && User.IsInRole("Candidate"))
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdStr, out var userId))
            {
                var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
                if (candidate != null) candidateId = candidate.Id;
            }
        }

        var results = await _searchService.SearchJobsAsync(query, candidateId);
        return Ok(results);
    }

    [HttpGet("search-advanced")]
    [AllowAnonymous]
    public async Task<ActionResult<MyNaukri.Application.DTOs.SuperAdmin.PaginatedResultDto<JobDto>>> SearchJobsAdvanced([FromQuery] JobSearchQueryDto request)
    {
        Guid? candidateId = null;
        if (User.Identity?.IsAuthenticated == true && User.IsInRole("Candidate"))
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdStr, out var userId))
            {
                var candidate = await _context.Candidates.FirstOrDefaultAsync(c => c.UserId == userId);
                if (candidate != null) candidateId = candidate.Id;
            }
        }

        var results = await _searchService.SearchJobsAdvancedAsync(request, candidateId);
        return Ok(results);
    }

    [HttpGet("recruiter")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult<IEnumerable<JobDto>>> GetRecruiterJobs()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        Guid? institutionId = recruiter?.InstitutionId;

        if (recruiter == null && (User.IsInRole("InstituteAdministrator") || User.IsInRole("Admin")))
        {
            var adminProfile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            institutionId = adminProfile?.InstitutionId;
        }

        if (institutionId == null && !User.IsInRole("SuperAdministrator"))
        {
            return StatusCode(403, "User is not registered as a recruiter or institute admin.");
        }

        var query = _context.Jobs
            .Include(j => j.Institution)
            .Include(j => j.Recruiter).ThenInclude(r => r.User)
            .Include(j => j.AssignedRecruiters).ThenInclude(a => a.Recruiter).ThenInclude(r => r.User)
            .AsQueryable();

        if (institutionId.HasValue)
        {
            if (recruiter != null)
            {
                // By default available to all recruiters in that institute. If restricted, only assigned recruiters or creator can access.
                query = query.Where(j => j.InstitutionId == institutionId.Value &&
                    (!j.IsRestrictedAccess || j.RecruiterId == recruiter.Id || j.AssignedRecruiters.Any(ar => ar.RecruiterId == recruiter.Id)));
            }
            else
            {
                // Institute Admin sees all jobs of the institute
                query = query.Where(j => j.InstitutionId == institutionId.Value);
            }
        }

        var jobs = await query
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new JobDto
            {
                Id = j.Id,
                Title = j.Title,
                Description = j.Description,
                Requirements = j.Requirements,
                MinSalary = j.MinSalary,
                MaxSalary = j.MaxSalary,
                JobType = j.JobType,
                Location = j.Location,
                RecruiterId = j.RecruiterId,
                InstitutionId = j.InstitutionId,
                CreatedAt = j.CreatedAt,
                IsActive = j.IsActive,
                CompanyName = j.Institution.Name,
                Keywords = j.Keywords,
                IsPlatinum = j.IsPlatinum,
                WorkMode = j.WorkMode,
                BoardAffiliation = j.BoardAffiliation,
                SubjectDepartment = j.SubjectDepartment,
                ScreeningQuestionsJson = j.ScreeningQuestionsJson,
                InstitutionLogoUrl = j.Institution != null ? j.Institution.LogoUrl : null,
                ApprovalStatus = j.ApprovalStatus.ToString(),
                ApprovalComment = j.ApprovalComment,
                ApprovedAt = j.ApprovedAt,
                RecruiterName = j.Recruiter != null ? $"{j.Recruiter.User.FirstName} {j.Recruiter.User.LastName}".Trim() : null,
                RecruiterEmail = j.Recruiter != null ? j.Recruiter.User.Email : null,
                RecruiterDesignation = j.Recruiter != null ? j.Recruiter.Designation : null,
                IsRestrictedAccess = j.IsRestrictedAccess,
                AssignedRecruiterIds = j.AssignedRecruiters.Select(ar => ar.RecruiterId).ToList(),
                AssignedRecruiterNames = j.AssignedRecruiters.Select(ar => $"{ar.Recruiter.User.FirstName} {ar.Recruiter.User.LastName}".Trim()).ToList(),
                IsOwner = recruiter != null && j.RecruiterId == recruiter.Id,
                CanManage = true
            })
            .ToListAsync();

        return Ok(jobs);
    }

    [HttpGet("{id}/matched-candidates")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult<IEnumerable<CandidateSearchResultDto>>> GetAiMatchedCandidates(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        if (recruiter == null && !User.IsInRole("SuperAdministrator") && !User.IsInRole("InstituteAdministrator"))
        {
            return StatusCode(403, "User is not registered as a recruiter.");
        }

        var job = await _context.Jobs.Include(j => j.AssignedRecruiters).FirstOrDefaultAsync(j => j.Id == id);
        if (job == null) return NotFound("Job not found.");

        if (recruiter != null && !User.IsInRole("SuperAdministrator") && !User.IsInRole("InstituteAdministrator"))
        {
            if (job.InstitutionId != recruiter.InstitutionId)
            {
                return StatusCode(403, "You do not have permission to view matches for this job.");
            }
            if (job.IsRestrictedAccess && job.RecruiterId != recruiter.Id && !job.AssignedRecruiters.Any(ar => ar.RecruiterId == recruiter.Id))
            {
                return StatusCode(403, "Access to this job is restricted to selected recruiters.");
            }
        }

        var matchedCandidates = await _searchService.GetAiMatchedCandidatesForJobAsync(id, recruiter?.Id);
        return Ok(matchedCandidates);
    }

    [HttpGet("{id}/matched-candidates/{candidateId}/email-cost")]
    [HttpGet("{id}/candidates/{candidateId}/email-cost")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult<CandidateJobEmailCostDto>> GetCandidateJobEmailCost(Guid id, Guid candidateId)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        var adminProfile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        var institutionId = recruiter?.InstitutionId ?? adminProfile?.InstitutionId;

        if (recruiter == null && !User.IsInRole("SuperAdministrator") && !User.IsInRole("InstituteAdministrator"))
        {
            return StatusCode(403, "User is not registered as a recruiter.");
        }

        var job = await _context.Jobs
            .Include(j => j.Institution)
            .Include(j => j.AssignedRecruiters)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null) return NotFound("Job not found.");

        if (recruiter != null && !User.IsInRole("SuperAdministrator") && !User.IsInRole("InstituteAdministrator"))
        {
            if (job.InstitutionId != recruiter.InstitutionId)
            {
                return StatusCode(403, "You do not have permission for this job.");
            }
            if (job.IsRestrictedAccess && job.RecruiterId != recruiter.Id && !job.AssignedRecruiters.Any(ar => ar.RecruiterId == recruiter.Id))
            {
                return StatusCode(403, "Access to this job is restricted to selected recruiters.");
            }
        }

        var candidate = await _context.Candidates
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == candidateId);

        if (candidate == null) return NotFound("Candidate not found.");

        var effectiveRecruiterId = recruiter?.Id ?? Guid.Empty;
        var effectiveInstitutionId = institutionId ?? job.InstitutionId;

        var access = effectiveRecruiterId != Guid.Empty
            ? await _context.CandidateContactAccesses.FirstOrDefaultAsync(a => a.RecruiterId == effectiveRecruiterId && a.CandidateId == candidateId)
            : null;

        var existingInstitutionAccess = await _context.CandidateContactAccesses
            .Include(a => a.Recruiter)
            .Where(a => 
                (a.InstitutionId == effectiveInstitutionId || (a.Recruiter != null && a.Recruiter.InstitutionId == effectiveInstitutionId)) &&
                a.CandidateId == candidateId)
            .ToListAsync();

        bool isContactUnlocked = (access != null && access.HasUnlockedContact) || existingInstitutionAccess.Any(a => a.HasUnlockedContact);
        bool isResumeUnlocked = (access != null && access.HasDownloadedResume) || existingInstitutionAccess.Any(a => a.HasDownloadedResume);

        var rates = effectiveRecruiterId != Guid.Empty
            ? await _creditService.GetRatesAsync(effectiveRecruiterId)
            : new RecruiterCreditRate();

        int emailCost = _configuration?.GetValue<int?>("CreditSettings:CandidateEmailRate") 
                        ?? _configuration?.GetValue<int?>("CreditRates:CandidateEmailRate")
                        ?? rates.CandidateEmailRate 
                        ?? 3;

        int contactCostRate = _configuration?.GetValue<int?>("CreditSettings:ContactViewRate") 
                              ?? rates.ContactViewRate 
                              ?? 2;

        int resumeCostRate = _configuration?.GetValue<int?>("CreditSettings:ResumeDownloadRate") 
                             ?? rates.ResumeDownloadRate 
                             ?? 5;

        int contactUnlockCost = isContactUnlocked ? 0 : contactCostRate;
        int resumeUnlockCost = isResumeUnlocked ? 0 : resumeCostRate;
        int totalCost = emailCost + contactUnlockCost + resumeUnlockCost;

        int currentBalance = effectiveRecruiterId != Guid.Empty 
            ? await _creditService.GetBalanceAsync(effectiveRecruiterId) 
            : 0;

        string recipientEmail = isContactUnlocked ? (candidate.User?.Email ?? string.Empty) : MaskEmail(candidate.User?.Email);
        string candidateName = isContactUnlocked
            ? $"{candidate.User?.FirstName} {candidate.User?.LastName}".Trim()
            : (string.IsNullOrEmpty(candidate.User?.FirstName) ? "Candidate" : $"{candidate.User.FirstName.Substring(0, 1)}***");

        return Ok(new CandidateJobEmailCostDto
        {
            CandidateId = candidate.Id,
            CandidateName = candidateName,
            RecipientEmail = recipientEmail,
            JobId = job.Id,
            JobTitle = job.Title,
            EmailCost = emailCost,
            ContactUnlockCost = contactUnlockCost,
            ResumeUnlockCost = resumeUnlockCost,
            TotalCost = totalCost,
            IsContactUnlocked = isContactUnlocked,
            IsResumeUnlocked = isResumeUnlocked,
            CurrentBalance = currentBalance,
            HasSufficientBalance = currentBalance >= totalCost
        });
    }

    [HttpPost("{id}/matched-candidates/{candidateId}/email")]
    [HttpPost("{id}/candidates/{candidateId}/email")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult<SendJobEmailResultDto>> SendJobEmailToCandidate(
        Guid id, 
        Guid candidateId, 
        [FromBody] SendJobEmailRequestDto? request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.Include(r => r.User).FirstOrDefaultAsync(r => r.UserId == userId);
        var adminProfile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        var institutionId = recruiter?.InstitutionId ?? adminProfile?.InstitutionId;

        if (recruiter == null && !User.IsInRole("SuperAdministrator") && !User.IsInRole("InstituteAdministrator"))
        {
            return StatusCode(403, "User is not registered as a recruiter.");
        }

        var job = await _context.Jobs
            .Include(j => j.Institution)
            .Include(j => j.AssignedRecruiters)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null) return NotFound("Job not found.");

        if (recruiter != null && !User.IsInRole("SuperAdministrator") && !User.IsInRole("InstituteAdministrator"))
        {
            if (job.InstitutionId != recruiter.InstitutionId)
            {
                return StatusCode(403, "You do not have permission for this job.");
            }
            if (job.IsRestrictedAccess && job.RecruiterId != recruiter.Id && !job.AssignedRecruiters.Any(ar => ar.RecruiterId == recruiter.Id))
            {
                return StatusCode(403, "Access to this job is restricted to selected recruiters.");
            }
        }

        var candidate = await _context.Candidates
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == candidateId);

        if (candidate == null) return NotFound("Candidate not found.");

        if (string.IsNullOrWhiteSpace(candidate.User?.Email))
        {
            return BadRequest("Candidate does not have a valid email address.");
        }

        var effectiveRecruiterId = recruiter?.Id ?? Guid.Empty;
        var effectiveInstitutionId = institutionId ?? job.InstitutionId;

        var access = effectiveRecruiterId != Guid.Empty
            ? await _context.CandidateContactAccesses.FirstOrDefaultAsync(a => a.RecruiterId == effectiveRecruiterId && a.CandidateId == candidateId)
            : null;

        var existingInstitutionAccess = await _context.CandidateContactAccesses
            .Include(a => a.Recruiter)
            .Where(a => 
                (a.InstitutionId == effectiveInstitutionId || (a.Recruiter != null && a.Recruiter.InstitutionId == effectiveInstitutionId)) &&
                a.CandidateId == candidateId)
            .ToListAsync();

        bool isContactUnlocked = (access != null && access.HasUnlockedContact) || existingInstitutionAccess.Any(a => a.HasUnlockedContact);
        bool isResumeUnlocked = (access != null && access.HasDownloadedResume) || existingInstitutionAccess.Any(a => a.HasDownloadedResume);

        var rates = effectiveRecruiterId != Guid.Empty
            ? await _creditService.GetRatesAsync(effectiveRecruiterId)
            : new RecruiterCreditRate();

        int emailCost = _configuration?.GetValue<int?>("CreditSettings:CandidateEmailRate") 
                        ?? _configuration?.GetValue<int?>("CreditRates:CandidateEmailRate")
                        ?? rates.CandidateEmailRate 
                        ?? 3;

        int contactCostRate = _configuration?.GetValue<int?>("CreditSettings:ContactViewRate") 
                              ?? rates.ContactViewRate 
                              ?? 2;

        int resumeCostRate = _configuration?.GetValue<int?>("CreditSettings:ResumeDownloadRate") 
                             ?? rates.ResumeDownloadRate 
                             ?? 5;

        int contactUnlockCost = isContactUnlocked ? 0 : contactCostRate;
        int resumeUnlockCost = isResumeUnlocked ? 0 : resumeCostRate;
        int totalCost = emailCost + contactUnlockCost + resumeUnlockCost;

        int balance = 0;
        if (effectiveRecruiterId != Guid.Empty)
        {
            balance = await _creditService.GetBalanceAsync(effectiveRecruiterId);
            if (balance < totalCost)
            {
                return StatusCode(402, new
                {
                    code = "INSUFFICIENT_CREDITS",
                    message = $"Insufficient credits. Required: {totalCost}, Available: {balance}.",
                    requiredCredits = totalCost,
                    availableCredits = balance,
                    shortfall = totalCost - balance,
                    emailCost = emailCost,
                    contactUnlockCost = contactUnlockCost,
                    resumeUnlockCost = resumeUnlockCost
                });
            }

            // Deduct credits for contact unlock if it was locked
            if (contactUnlockCost > 0)
            {
                var contactDeductSuccess = await _creditService.DeductCreditsAsync(
                    effectiveRecruiterId, 
                    contactUnlockCost, 
                    TransactionType.RecruiterContactView, 
                    candidate.Id.ToString(), 
                    $"Unlocked contact for candidate {candidate.User.FirstName} (via Job Email: {job.Title})", 
                    userId);
                if (!contactDeductSuccess) return StatusCode(402, "Failed to deduct credits for contact unlock.");
            }

            // Deduct credits for resume unlock if it was locked
            if (resumeUnlockCost > 0)
            {
                var resumeDeductSuccess = await _creditService.DeductCreditsAsync(
                    effectiveRecruiterId, 
                    resumeUnlockCost, 
                    TransactionType.RecruiterResumeDownload, 
                    candidate.Id.ToString(), 
                    $"Unlocked resume for candidate {candidate.User.FirstName} (via Job Email: {job.Title})", 
                    userId);
                if (!resumeDeductSuccess) return StatusCode(402, "Failed to deduct credits for resume unlock.");
            }

            // Deduct credits for sending the email
            if (emailCost > 0)
            {
                var emailDeductSuccess = await _creditService.DeductCreditsAsync(
                    effectiveRecruiterId, 
                    emailCost, 
                    TransactionType.RecruiterCandidateEmail, 
                    candidate.Id.ToString(), 
                    $"Sent job description for '{job.Title}' to candidate {candidate.User.FirstName}", 
                    userId);
                if (!emailDeductSuccess) return StatusCode(402, "Failed to deduct credits for candidate email.");
            }

            // Unlock contact and resume records for this recruiter/institution
            if (access == null)
            {
                access = new CandidateContactAccess
                {
                    RecruiterId = effectiveRecruiterId,
                    InstitutionId = effectiveInstitutionId,
                    CandidateId = candidate.Id,
                    HasUnlockedContact = true,
                    HasDownloadedResume = true,
                    CreditsCharged = contactUnlockCost + resumeUnlockCost
                };
                _context.CandidateContactAccesses.Add(access);
            }
            else
            {
                access.InstitutionId = effectiveInstitutionId;
                access.HasUnlockedContact = true;
                access.HasDownloadedResume = true;
                access.CreditsCharged += (contactUnlockCost + resumeUnlockCost);
            }

            await _context.SaveChangesAsync();
        }

        // Format and send the email with full JD
        var institutionName = job.Institution?.Name ?? "EduKey360 Partner Institution";
        var recruiterName = recruiter?.User != null ? $"{recruiter.User.FirstName} {recruiter.User.LastName}".Trim() : "Hiring Team";
        var subject = !string.IsNullOrWhiteSpace(request?.Subject) 
            ? request.Subject 
            : $"Job Opportunity: {job.Title} at {institutionName}";

        var emailBody = BuildJobDescriptionEmail(candidate, job, institutionName, recruiterName, request?.CustomMessage);

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.SendEmailAsync(
                    candidate.User.Email,
                    subject,
                    emailBody,
                    emailType: EmailType.JobAlert);
            }
            catch
            {
                // In case of SMTP issues, email failure does not roll back already granted access
            }
        }

        int remainingBalance = effectiveRecruiterId != Guid.Empty 
            ? await _creditService.GetBalanceAsync(effectiveRecruiterId) 
            : 0;

        var candidateDto = new CandidateSearchResultDto
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
            CurrentLocation = candidate.CurrentLocation,
            Education = candidate.Education,
            Gender = candidate.Gender,
            DifferentlyAbled = candidate.DifferentlyAbled,
            ExServiceman = candidate.ExServiceman,
            ExServicemanBranch = candidate.ExServicemanBranch,
            NoticePeriod = candidate.NoticePeriod,
            ClassesTaught = candidate.ClassesTaught,
            BoardsTaught = candidate.BoardsTaught,
            IsCtetQualified = candidate.IsCtetQualified,
            DemoVideoUrl = candidate.DemoVideoUrl,
            DemoVideoStatus = candidate.DemoVideoStatus.ToString(),
            DemoVideoSubject = candidate.DemoVideoSubject,
            DemoVideoSummary = candidate.DemoVideoSummary,
            JoiningAvailability = candidate.JoiningAvailability,
            UpdatedAt = candidate.UpdatedAt ?? candidate.CreatedAt,
            HasUnlockedContact = true,
            HasDownloadedResume = true,
            AlreadyUnlockedByInstitution = true
        };

        return Ok(new SendJobEmailResultDto
        {
            Success = true,
            Message = $"Job Description successfully sent to {candidate.User.FirstName} {candidate.User.LastName}.",
            CreditsDeducted = totalCost,
            EmailCost = emailCost,
            ContactUnlockCost = contactUnlockCost,
            ResumeUnlockCost = resumeUnlockCost,
            RemainingBalance = remainingBalance,
            Candidate = candidateDto
        });
    }

    private static string BuildJobDescriptionEmail(
        Candidate candidate, 
        Job job, 
        string institutionName, 
        string recruiterName, 
        string? customMessage)
    {
        var salaryDisplay = job.MinSalary.HasValue && job.MaxSalary.HasValue
            ? $"₹{job.MinSalary:N0} - ₹{job.MaxSalary:N0} PA"
            : job.MinSalary.HasValue
                ? $"From ₹{job.MinSalary:N0} PA"
                : "Competitive / As per institutional standards";

        var customNoteHtml = !string.IsNullOrWhiteSpace(customMessage)
            ? $@"
      <div style='background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin: 20px 0;'>
        <div style='font-size: 12px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px;'>Note from {System.Net.WebUtility.HtmlEncode(recruiterName)}</div>
        <div style='font-size: 14px; line-height: 1.5; color: #1e3a8a;'>{System.Net.WebUtility.HtmlEncode(customMessage).Replace("\n", "<br/>")}</div>
      </div>"
            : "";

        var formattedDescription = !string.IsNullOrWhiteSpace(job.Description)
            ? System.Net.WebUtility.HtmlEncode(job.Description).Replace("\n", "<br/>")
            : "No detailed description provided.";

        var formattedRequirements = !string.IsNullOrWhiteSpace(job.Requirements)
            ? System.Net.WebUtility.HtmlEncode(job.Requirements).Replace("\n", "<br/>")
            : "Standard educational qualifications and experience required.";

        var candidateFirstName = candidate.User?.FirstName ?? "Candidate";

        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Job Opportunity: {System.Net.WebUtility.HtmlEncode(job.Title)}</title>
</head>
<body style='margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;'>
  <div style='max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);'>
    
    <!-- Header Banner -->
    <div style='background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 28px 32px; color: #ffffff;'>
      <div style='font-size: 22px; font-weight: bold; letter-spacing: 0.5px;'>EduKey360</div>
      <div style='font-size: 13px; opacity: 0.9; margin-top: 4px;'>Direct Recruitment & Institutional Careers</div>
    </div>

    <!-- Body Content -->
    <div style='padding: 32px;'>
      <div style='display: inline-block; padding: 6px 14px; background-color: #eef2ff; color: #4338ca; font-size: 13px; font-weight: 700; border-radius: 9999px; margin-bottom: 16px;'>
        ✨ AI Matched Career Opportunity
      </div>

      <h2 style='margin: 0 0 12px 0; color: #0f172a; font-size: 22px; font-weight: 700;'>
        {System.Net.WebUtility.HtmlEncode(job.Title)}
      </h2>
      <div style='font-size: 15px; color: #475569; margin-bottom: 20px;'>
        🏢 <strong>{System.Net.WebUtility.HtmlEncode(institutionName)}</strong>
      </div>
      
      <p style='font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;'>
        Dear <strong>{System.Net.WebUtility.HtmlEncode(candidateFirstName)}</strong>,
      </p>

      <p style='font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;'>
        Our hiring team at <strong>{System.Net.WebUtility.HtmlEncode(institutionName)}</strong> reviewed your profile through EduKey360 and found that your skills and teaching credentials strongly match our open position. We would love to share this opportunity with you!
      </p>

      {customNoteHtml}

      <!-- Job Highlights Card -->
      <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;'>
        <div style='font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px;'>Job Overview</div>
        
        <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
          <tr>
            <td style='padding: 6px 0; color: #64748b; width: 35%;'>📍 Location:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{System.Net.WebUtility.HtmlEncode(job.Location ?? "Not Specified")} {(!string.IsNullOrWhiteSpace(job.WorkMode) ? $"({System.Net.WebUtility.HtmlEncode(job.WorkMode)})" : "")}</td>
          </tr>
          <tr>
            <td style='padding: 6px 0; color: #64748b;'>⏱ Employment Type:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{job.JobType}</td>
          </tr>
          {(!string.IsNullOrWhiteSpace(job.SubjectDepartment) ? $@"
          <tr>
            <td style='padding: 6px 0; color: #64748b;'>📚 Department / Subject:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{System.Net.WebUtility.HtmlEncode(job.SubjectDepartment)}</td>
          </tr>" : "")}
          {(!string.IsNullOrWhiteSpace(job.BoardAffiliation) ? $@"
          <tr>
            <td style='padding: 6px 0; color: #64748b;'>🏛 Board Affiliation:</td>
            <td style='padding: 6px 0; color: #1e293b; font-weight: 600;'>{System.Net.WebUtility.HtmlEncode(job.BoardAffiliation)}</td>
          </tr>" : "")}
          <tr>
            <td style='padding: 6px 0; color: #64748b;'>💰 Offered Salary:</td>
            <td style='padding: 6px 0; color: #16a34a; font-weight: 700;'>{salaryDisplay}</td>
          </tr>
        </table>
      </div>

      <!-- Job Description -->
      <div style='margin: 24px 0;'>
        <h3 style='font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;'>📋 Job Description</h3>
        <div style='font-size: 14px; line-height: 1.6; color: #334155; background-color: #ffffff; border: 1px solid #f1f5f9; padding: 14px 16px; border-radius: 6px;'>
          {formattedDescription}
        </div>
      </div>

      <!-- Requirements -->
      <div style='margin: 24px 0;'>
        <h3 style='font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;'>🎯 Requirements & Qualifications</h3>
        <div style='font-size: 14px; line-height: 1.6; color: #334155; background-color: #ffffff; border: 1px solid #f1f5f9; padding: 14px 16px; border-radius: 6px;'>
          {formattedRequirements}
        </div>
      </div>

      <div style='margin-top: 32px; text-align: center;'>
        <a href='https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io/jobs' 
           style='display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);'>
          Explore & Apply on EduKey360
        </a>
      </div>

      <div style='margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;'>
        Best regards,<br/>
        <strong>{System.Net.WebUtility.HtmlEncode(recruiterName)}</strong><br/>
        {System.Net.WebUtility.HtmlEncode(institutionName)}
      </div>

    </div>

    <!-- Footer -->
    <div style='background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;'>
      This email was sent via EduKey360 platform because your profile matched an open position at {System.Net.WebUtility.HtmlEncode(institutionName)}.<br/>
      EduKey360 • Enabling Educational Careers
    </div>

  </div>
</body>
</html>";
    }

    private static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return string.Empty;
        var parts = email.Split('@');
        if (parts.Length != 2) return "***@***.***";
        var name = parts[0];
        var domain = parts[1];
        var maskedName = name.Length > 1 ? name.Substring(0, 1) + "***" : "***";
        return $"{maskedName}@{domain}";
    }

    [HttpGet("top-institutions")]
    [AllowAnonymous]
    public async Task<ActionResult> GetTopInstitutions()
    {
        var topInstitutions = await _context.Jobs
            .Include(j => j.Institution)
            .Where(j => j.IsActive && j.ApprovalStatus == JobApprovalStatus.Approved && j.Institution != null && !string.IsNullOrEmpty(j.Institution.Name))
            .GroupBy(j => new { j.Institution.Id, j.Institution.Name, j.Institution.City, j.Institution.LogoUrl })
            .Select(g => new 
            {
                InstitutionId = g.Key.Id,
                InstitutionName = g.Key.Name,
                City = g.Key.City,
                LogoUrl = g.Key.LogoUrl,
                JobCount = g.Count()
            })
            .OrderByDescending(x => x.JobCount)
            .Take(8)
            .ToListAsync();

        return Ok(topInstitutions);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult> UpdateJob(Guid id, JobDto jobDto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        var adminProfile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        var institutionId = recruiter?.InstitutionId ?? adminProfile?.InstitutionId;

        if (institutionId == null && !User.IsInRole("SuperAdministrator"))
        {
            return StatusCode(403, "User is not associated with an institution.");
        }

        var job = await _context.Jobs
            .Include(j => j.AssignedRecruiters)
            .FirstOrDefaultAsync(j => j.Id == id && (institutionId == null || j.InstitutionId == institutionId.Value));

        if (job == null) return NotFound("Job not found.");

        if (recruiter != null && job.IsRestrictedAccess && job.RecruiterId != recruiter.Id && !job.AssignedRecruiters.Any(ar => ar.RecruiterId == recruiter.Id))
        {
            return StatusCode(403, "You don't have permission to edit this restricted job.");
        }

        job.Title = jobDto.Title;
        job.Description = jobDto.Description;
        job.Requirements = jobDto.Requirements;
        job.MinSalary = jobDto.MinSalary;
        job.MaxSalary = jobDto.MaxSalary;
        job.JobType = jobDto.JobType;
        job.Location = jobDto.Location;
        job.Keywords = jobDto.Keywords;
        if (!string.IsNullOrEmpty(jobDto.WorkMode)) job.WorkMode = jobDto.WorkMode;
        if (!string.IsNullOrEmpty(jobDto.BoardAffiliation)) job.BoardAffiliation = jobDto.BoardAffiliation;
        if (!string.IsNullOrEmpty(jobDto.SubjectDepartment)) job.SubjectDepartment = jobDto.SubjectDepartment;
        if (!string.IsNullOrEmpty(jobDto.ScreeningQuestionsJson)) job.ScreeningQuestionsJson = jobDto.ScreeningQuestionsJson;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("institution/{institutionId}")]
    [AllowAnonymous]
    public async Task<ActionResult> GetInstitutionShowcase(Guid institutionId)
    {
        var institution = await _context.Institutions
            .FirstOrDefaultAsync(i => i.Id == institutionId);

        if (institution == null) return NotFound("Institution not found.");

        var activeJobs = await _context.Jobs
            .Where(j => j.InstitutionId == institutionId && j.IsActive && j.ApprovalStatus == JobApprovalStatus.Approved)
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new JobDto
            {
                Id = j.Id,
                Title = j.Title,
                Description = j.Description,
                Requirements = j.Requirements,
                MinSalary = j.MinSalary,
                MaxSalary = j.MaxSalary,
                JobType = j.JobType,
                Location = j.Location,
                RecruiterId = j.RecruiterId,
                InstitutionId = j.InstitutionId,
                CreatedAt = j.CreatedAt,
                IsActive = j.IsActive,
                CompanyName = institution.Name,
                Keywords = j.Keywords,
                IsPlatinum = j.IsPlatinum,
                WorkMode = j.WorkMode,
                BoardAffiliation = j.BoardAffiliation,
                SubjectDepartment = j.SubjectDepartment,
                InstitutionLogoUrl = institution.LogoUrl
            })
            .ToListAsync();

        return Ok(new
        {
            Id = institution.Id,
            Name = institution.Name,
            Code = institution.Code,
            Type = institution.Type.ToString(),
            LogoUrl = institution.LogoUrl,
            Address = institution.Address,
            City = institution.City,
            State = institution.State,
            PINCode = institution.PINCode,
            Email = institution.Email,
            Phone = institution.Phone,
            Website = institution.Website,
            Description = institution.Description,
            ActiveJobs = activeJobs
        });
    }

    [HttpPatch("{id}/close")]
    [Authorize(Roles = "Recruiter,CompanyHR,InstituteAdministrator,SuperAdministrator")]
    public async Task<ActionResult> CloseJob(Guid id)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == userId);
        var adminProfile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        var institutionId = recruiter?.InstitutionId ?? adminProfile?.InstitutionId;

        if (institutionId == null && !User.IsInRole("SuperAdministrator"))
        {
            return StatusCode(403, "User is not associated with an institution.");
        }

        var job = await _context.Jobs
            .Include(j => j.AssignedRecruiters)
            .FirstOrDefaultAsync(j => j.Id == id && (institutionId == null || j.InstitutionId == institutionId.Value));

        if (job == null) return NotFound("Job not found.");

        if (recruiter != null && job.IsRestrictedAccess && job.RecruiterId != recruiter.Id && !job.AssignedRecruiters.Any(ar => ar.RecruiterId == recruiter.Id))
        {
            return StatusCode(403, "You don't have permission to close this restricted job.");
        }

        job.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("seed")]
    [AllowAnonymous]
    public async Task<ActionResult> SeedJobs()
    {
        var institution = await _context.Institutions.FirstOrDefaultAsync();
        if (institution == null)
        {
            institution = new Institution { Name = "EduKey360 Global Trust", Description = "Premier network of educational institutes." };
            _context.Institutions.Add(institution);
            await _context.SaveChangesAsync();
        }

        var recruiterUser = await _context.Users.FirstOrDefaultAsync(u => u.Role == MyNaukri.Domain.Enums.Role.Recruiter);
        if (recruiterUser == null)
        {
            recruiterUser = new User { Email = "seed@edukey360.com", PasswordHash = "hashed", FirstName = "Admin", LastName = "User", Role = MyNaukri.Domain.Enums.Role.Recruiter };
            _context.Users.Add(recruiterUser);
            await _context.SaveChangesAsync();
        }

        var recruiter = await _context.Recruiters.FirstOrDefaultAsync(r => r.UserId == recruiterUser.Id);
        if (recruiter == null)
        {
            recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Designation = "HR Manager" };
            _context.Recruiters.Add(recruiter);

            var creditRate = new RecruiterCreditRate
            {
                Recruiter = recruiter,
                ResumeDownloadRate = 5,
                ContactViewRate = 2,
                BulkProfileDownloadRate = 2,
                NormalJobPostingRate = 20,
                PlatinumJobPostingRate = 40,
                CandidateEmailRate = 3
            };
            _context.RecruiterCreditRates.Add(creditRate);

            await _context.SaveChangesAsync();
        }

        var titles = new[] { "Mathematics Teacher", "Physics Teacher", "Primary School Teacher", "School Principal", "Librarian", "Physical Education Instructor", "Special Education Teacher", "School Administrator", "Computer Science Teacher", "Guest Faculty" };
        var keywordsList = new[] { "Teaching, Math, High School, TGT", "Physics, Science, PGT", "Primary, Kids, English", "Administration, Leadership, Principal", "Library, Books", "Sports, PE, Physical Education", "Special Needs, Educator", "Admin, Management", "IT, Computers, Coding", "Part-time, Guest" };
        var locations = new[] { "Delhi", "Mumbai", "Bangalore", "Chennai", "Pune", "Remote", "Hyderabad", "Kolkata" };
        
        var random = new Random();
        for (int i = 0; i < 100; i++)
        {
            var titleIndex = random.Next(titles.Length);
            var job = new Job
            {
                Title = titles[titleIndex],
                Description = $"We are looking for a passionate {titles[titleIndex]} to join our team.",
                Requirements = "Bachelor's degree in Education or related field. Minimum 2 years of experience.",
                MinSalary = random.Next(20, 50) * 1000,
                MaxSalary = random.Next(50, 100) * 1000,
                JobType = MyNaukri.Domain.Enums.JobType.FullTime,
                Location = locations[random.Next(locations.Length)],
                IsActive = true,
                RecruiterId = recruiter.Id,
                InstitutionId = institution.Id,
                Keywords = keywordsList[titleIndex]
            };
            _context.Jobs.Add(job);
        }

        await _context.SaveChangesAsync();
        return Ok($"Seeded 100 jobs successfully!");
    }
}
