using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Services;

public class DbSearchService : ISearchService
{
    private readonly ApplicationDbContext _context;

    public DbSearchService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<JobDto>> SearchJobsAsync(string query)
    {
        var dbQuery = _context.Jobs
            .Include(j => j.Institution)
            .Where(j => j.IsActive);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            dbQuery = dbQuery.Where(j => 
                j.Title.ToLower().Contains(lowerQuery) || 
                j.Description.ToLower().Contains(lowerQuery) ||
                j.Location.ToLower().Contains(lowerQuery) ||
                j.Institution.Name.ToLower().Contains(lowerQuery));
        }

        var jobs = await dbQuery
            .OrderByDescending(j => j.CreatedAt)
            .Take(100)
            .ToListAsync();

        return jobs.Select(j => new JobDto
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
            Keywords = j.Keywords
        });
    }

    public async Task<IEnumerable<CandidateSearchResultDto>> SearchCandidatesAsync(CandidateSearchRequestDto request)
    {
        var dbQuery = _context.Candidates
            .Include(c => c.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var lowerQuery = request.Keyword.ToLower();
            dbQuery = dbQuery.Where(c => 
                c.Skills.ToLower().Contains(lowerQuery) || 
                c.Summary.ToLower().Contains(lowerQuery) ||
                c.Education.ToLower().Contains(lowerQuery) ||
                c.User.FirstName.ToLower().Contains(lowerQuery) ||
                c.User.LastName.ToLower().Contains(lowerQuery));
        }

        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            var lowerLoc = request.Location.ToLower();
            dbQuery = dbQuery.Where(c => c.CurrentLocation.ToLower().Contains(lowerLoc) || c.PreferredLocations.ToLower().Contains(lowerLoc));
        }

        if (request.MinExperienceYears.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.TotalExperienceYears >= request.MinExperienceYears.Value);
        }

        if (request.MaxExperienceYears.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.TotalExperienceYears <= request.MaxExperienceYears.Value);
        }

        if (request.Gender.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.Gender == request.Gender.Value);
        }

        if (request.DifferentlyAbled.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.DifferentlyAbled == request.DifferentlyAbled.Value);
        }

        if (request.ExServiceman.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.ExServiceman == request.ExServiceman.Value);
        }

        if (request.ExServicemanBranch.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.ExServicemanBranch == request.ExServicemanBranch.Value);
        }

        var candidates = await dbQuery
            .OrderByDescending(c => c.Id)
            .Take(100)
            .ToListAsync();

        return candidates.Select(c => new CandidateSearchResultDto
        {
            Id = c.Id,
            FirstName = c.User.FirstName,
            LastName = c.User.LastName,
            Skills = c.Skills,
            Summary = c.Summary,
            TotalExperienceYears = c.TotalExperienceYears,
            CurrentLocation = c.CurrentLocation,
            Education = c.Education,
            Gender = c.Gender,
            DifferentlyAbled = c.DifferentlyAbled,
            ExServiceman = c.ExServiceman,
            ExServicemanBranch = c.ExServicemanBranch
        });
    }
}
