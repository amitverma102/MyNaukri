using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
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

    public JobsController(ApplicationDbContext context, IAiService aiService, ISearchService searchService, ICreditService creditService)
    {
        _context = context;
        _aiService = aiService;
        _searchService = searchService;
        _creditService = creditService;
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
            SubjectDepartment = jobDto.SubjectDepartment
        };

        _context.Jobs.Add(job);
        await _context.SaveChangesAsync();

        jobDto.Id = job.Id;
        jobDto.CreatedAt = job.CreatedAt;
        jobDto.RecruiterId = job.RecruiterId;
        jobDto.InstitutionId = job.InstitutionId;

        return CreatedAtAction(nameof(GetJobs), new { id = job.Id }, jobDto);
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
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var jobs = await _context.Jobs
            .Where(j => j.RecruiterId == recruiter.Id)
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
                InstitutionLogoUrl = j.Institution != null ? j.Institution.LogoUrl : null
            })
            .ToListAsync();

        return Ok(jobs);
    }

    [HttpGet("top-institutions")]
    [AllowAnonymous]
    public async Task<ActionResult> GetTopInstitutions()
    {
        var topInstitutions = await _context.Jobs
            .Include(j => j.Institution)
            .Where(j => j.IsActive && j.Institution != null && !string.IsNullOrEmpty(j.Institution.Name))
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
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.RecruiterId == recruiter.Id);
        if (job == null) return NotFound("Job not found or you don't have permission to edit it.");

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
            .Where(j => j.InstitutionId == institutionId && j.IsActive)
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
        if (recruiter == null) return StatusCode(403, "User is not registered as a recruiter.");

        var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.RecruiterId == recruiter.Id);
        if (job == null) return NotFound("Job not found or you don't have permission to edit it.");

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
