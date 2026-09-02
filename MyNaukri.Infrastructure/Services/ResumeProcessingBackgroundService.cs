using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using System.Security.Cryptography;

namespace MyNaukri.Infrastructure.Services;

public class ResumeProcessingBackgroundService : BackgroundService
{
    private readonly IResumeProcessingQueue _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ResumeProcessingBackgroundService> _logger;

    public ResumeProcessingBackgroundService(
        IResumeProcessingQueue queue,
        IServiceProvider serviceProvider,
        ILogger<ResumeProcessingBackgroundService> logger)
    {
        _queue = queue;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Resume Processing Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var resumeId = await _queue.DequeueAsync(stoppingToken);

                using var scope = _serviceProvider.CreateScope();
                await ProcessResumeAsync(resumeId, scope.ServiceProvider, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Prevent throwing if stopping token was canceled
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing resume processing.");
            }
        }
    }

    private async Task ProcessResumeAsync(Guid resumeId, IServiceProvider services, CancellationToken cancellationToken)
    {
        var dbContext = services.GetRequiredService<ApplicationDbContext>();
        var resumeParser = services.GetRequiredService<IResumeParser>();
        var passwordHasher = services.GetRequiredService<IPasswordHasher>();

        var resume = await dbContext.Resumes
            .FirstOrDefaultAsync(r => r.Id == resumeId, cancellationToken);

        if (resume == null) return;

        try
        {
            resume.ParsingStatus = ParsingStatus.PROCESSING;
            await dbContext.SaveChangesAsync(cancellationToken);

            byte[] fileBytes;
            if (resume.StoragePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                using var httpClient = new HttpClient();
                fileBytes = await httpClient.GetByteArrayAsync(resume.StoragePath, cancellationToken);
            }
            else
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", resume.StoragePath.TrimStart('/'));
                if (!File.Exists(filePath))
                {
                    throw new FileNotFoundException("Resume file not found on disk: " + filePath);
                }
                fileBytes = await File.ReadAllBytesAsync(filePath, cancellationToken);
            }
            
            // Extract using Gemini
            var parsedResult = await resumeParser.ParseAsync(fileBytes, resume.StoredFileName);
            
            // Handle parsed data
            var normalizedEmail = parsedResult.Email?.ToLowerInvariant()?.Trim();
            if (string.IsNullOrEmpty(normalizedEmail))
            {
                throw new Exception("Resume parsed successfully but no email was found. Cannot link to Candidate.");
            }

            // Check if User exists
            var existingUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);
            Candidate candidate;

            if (existingUser != null)
            {
                // User exists, find candidate profile
                candidate = await dbContext.Candidates
                    .Include(c => c.CandidateSkills)
                    .FirstOrDefaultAsync(c => c.UserId == existingUser.Id, cancellationToken);

                if (candidate == null)
                {
                    // Somehow user exists but no candidate profile (maybe they are a recruiter?)
                    // Create a candidate profile for them if they don't have one, or fail.
                    // For safety, let's create it if role is Candidate, otherwise fail.
                    if (existingUser.Role != Role.Candidate)
                    {
                        throw new Exception("Email belongs to a non-candidate user.");
                    }

                    candidate = new Candidate
                    {
                        UserId = existingUser.Id,
                        ProfileSource = ProfileSource.SUPERADMIN_RESUME_UPLOAD
                    };
                    dbContext.Candidates.Add(candidate);
                }
            }
            else
            {
                // User does not exist, create User and Candidate
                var rawPassword = "Sch@123";
                existingUser = new User
                {
                    Email = normalizedEmail,
                    FirstName = parsedResult.FirstName ?? "Unknown",
                    LastName = parsedResult.LastName ?? "Unknown",
                    PasswordHash = passwordHasher.Hash(rawPassword),
                    Role = Role.Candidate,
                    IsEmailVerified = true // Mark as verified if created by admin?
                };
                dbContext.Users.Add(existingUser);

                candidate = new Candidate
                {
                    User = existingUser,
                    ProfileSource = ProfileSource.SUPERADMIN_RESUME_UPLOAD
                };
                dbContext.Candidates.Add(candidate);

                var notificationService = services.GetRequiredService<MyNaukri.Application.Interfaces.INotificationService>();
                await notificationService.SendEmailAsync(
                    existingUser.Email,
                    "Welcome to EduKey360 - Account Created",
                    $"Your account has been created by our administrator.\n\nYour username: {existingUser.Email}\nYour temporary password: {rawPassword}\n\nPlease login and change your password."
                );
            }

            // Update Candidate Details
            candidate.ProfileLastParsedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(parsedResult.PhoneNumber)) candidate.PhoneNumber = parsedResult.PhoneNumber;
            if (!string.IsNullOrEmpty(parsedResult.CurrentLocation)) candidate.CurrentLocation = parsedResult.CurrentLocation;
            if (parsedResult.TotalExperienceYears > 0) candidate.TotalExperienceYears = parsedResult.TotalExperienceYears;
            if (!string.IsNullOrEmpty(parsedResult.ClassesTaught)) candidate.ClassesTaught = parsedResult.ClassesTaught;
            if (!string.IsNullOrEmpty(parsedResult.BoardsTaught)) candidate.BoardsTaught = parsedResult.BoardsTaught;
            if (!string.IsNullOrEmpty(parsedResult.Education)) candidate.Education = parsedResult.Education;
            if (!string.IsNullOrEmpty(parsedResult.Certifications)) candidate.Certifications = parsedResult.Certifications;

            // Link resume to the found/created candidate
            resume.Candidate = candidate;
            
            // Set as primary if it's the first one, or maybe update old ones.
            // For now, if no primary exists, make this primary.
            var hasPrimary = await dbContext.Resumes.AnyAsync(r => r.CandidateId == candidate.Id && r.IsPrimary, cancellationToken);
            if (!hasPrimary)
            {
                resume.IsPrimary = true;
                candidate.ResumeUrl = resume.StoragePath; // keep legacy field in sync
            }

            // Process Skills
            if (!string.IsNullOrEmpty(parsedResult.Skills))
            {
                var skillNames = parsedResult.Skills.Split(new[] { ',', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                       .Select(s => s.Trim())
                                       .Where(s => !string.IsNullOrEmpty(s))
                                       .Distinct()
                                       .ToList();

                foreach (var skillName in skillNames)
                {
                    var normalizedName = skillName.ToUpperInvariant();
                    var skill = await dbContext.Skills.FirstOrDefaultAsync(s => s.NormalizedName == normalizedName, cancellationToken);
                    if (skill == null)
                    {
                        skill = new Skill { DisplayName = skillName, NormalizedName = normalizedName };
                        dbContext.Skills.Add(skill);
                    }

                    // add to candidate if not exists
                    var hasSkill = candidate.CandidateSkills.Any(cs => cs.SkillId == skill.Id || cs.Skill == skill);
                    if (!hasSkill)
                    {
                        candidate.CandidateSkills.Add(new CandidateSkill
                        {
                            Candidate = candidate,
                            Skill = skill,
                            Source = "ResumeUpload"
                        });
                    }
                }
                
                // Keep legacy string updated
                var currentSkills = candidate.CandidateSkills.Select(cs => cs.Skill?.DisplayName ?? skillNames.FirstOrDefault()).Where(s => s != null).ToList();
                candidate.Skills = string.Join(", ", currentSkills);
            }

            resume.ParsingStatus = ParsingStatus.PARSED;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse resume {ResumeId}", resumeId);
            resume.ParsingStatus = ParsingStatus.FAILED;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private string GenerateRandomPassword()
    {
        var randomBytes = new byte[8];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        return Convert.ToBase64String(randomBytes) + "aA1!"; // satisfy basic complexity requirements
    }
}
