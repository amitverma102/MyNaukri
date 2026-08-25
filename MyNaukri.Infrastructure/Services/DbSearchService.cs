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

    public async Task<IEnumerable<JobDto>> SearchJobsAsync(string query, Guid? candidateId = null)
    {
        var dbQuery = _context.Jobs
            .Include(j => j.Institution)
            .Where(j => j.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            dbQuery = dbQuery.Where(j => 
                j.Title.ToLower().Contains(lowerQuery) || 
                j.Description.ToLower().Contains(lowerQuery) ||
                j.Location.ToLower().Contains(lowerQuery) ||
                j.Institution.Name.ToLower().Contains(lowerQuery));
        }

        var jobsList = await dbQuery
            .OrderByDescending(j => j.IsPlatinum)
            .ThenByDescending(j => j.CreatedAt)
            .Take(1000)
            .ToListAsync();
        var result = jobsList.Select(j => new JobDto
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
            IsPlatinum = j.IsPlatinum
        }).ToList();

        if (candidateId.HasValue)
        {
            var candidate = await _context.Candidates.FindAsync(candidateId.Value);
            if (candidate != null)
            {
                var appliedJobIds = await _context.JobApplications
                    .Where(ja => ja.CandidateId == candidateId.Value)
                    .Select(ja => ja.JobId)
                    .ToListAsync();

                foreach (var j in result)
                {
                    j.IsApplied = appliedJobIds.Contains(j.Id);
                }

                var prefLocations = (candidate.PreferredLocations ?? "").ToLower().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                var currLocation = (candidate.CurrentLocation ?? "").ToLower().Trim();
                if (!string.IsNullOrEmpty(currLocation) && !prefLocations.Contains(currLocation)) prefLocations.Add(currLocation);

                var subjects = new List<string>();
                subjects.AddRange((candidate.Skills ?? "").ToLower().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()));
                subjects.AddRange((candidate.ClassesTaught ?? "").ToLower().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()));
                subjects.AddRange((candidate.BoardsTaught ?? "").ToLower().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()));
                subjects = subjects.Distinct().ToList();

                result = result.OrderByDescending(j => j.IsPlatinum)
                .ThenByDescending(j => {
                    var jobLoc = (j.Location ?? "").ToLower();
                    var jobText = ((j.Title ?? "") + " " + (j.Description ?? "") + " " + (j.Keywords ?? "")).ToLower();
                    bool isLocMatch = prefLocations.Any(pl => jobLoc.Contains(pl) || pl.Contains(jobLoc));
                    bool isSubjMatch = subjects.Any(s => jobText.Contains(s));
                    return isLocMatch || isSubjMatch ? 1 : 0;
                })
                .ThenByDescending(j => j.CreatedAt)
                .ToList();
                
                return result;
            }
        }

        return result
            .OrderByDescending(j => j.IsPlatinum)
            .ThenByDescending(j => j.CreatedAt)
            .ToList();
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
