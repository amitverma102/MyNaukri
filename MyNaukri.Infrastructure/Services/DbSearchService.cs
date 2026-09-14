using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
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
            IsPlatinum = j.IsPlatinum,
            InstitutionLogoUrl = j.Institution != null ? j.Institution.LogoUrl : null
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

    public async Task<MyNaukri.Application.DTOs.SuperAdmin.PaginatedResultDto<JobDto>> SearchJobsAdvancedAsync(JobSearchQueryDto request, Guid? candidateId = null)
    {
        var dbQuery = _context.Jobs
            .Include(j => j.Institution)
            .Where(j => j.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var lowerQuery = request.Query.ToLower();
            dbQuery = dbQuery.Where(j => 
                j.Title.ToLower().Contains(lowerQuery) || 
                j.Description.ToLower().Contains(lowerQuery) ||
                j.Location.ToLower().Contains(lowerQuery) ||
                j.Keywords.ToLower().Contains(lowerQuery) ||
                j.Institution.Name.ToLower().Contains(lowerQuery));
        }

        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            var lowerLoc = request.Location.ToLower();
            dbQuery = dbQuery.Where(j => j.Location.ToLower().Contains(lowerLoc));
        }

        if (request.JobType.HasValue)
        {
            dbQuery = dbQuery.Where(j => j.JobType == request.JobType.Value);
        }

        if (request.MinSalary.HasValue)
        {
            dbQuery = dbQuery.Where(j => (j.MinSalary.HasValue && j.MinSalary >= request.MinSalary.Value) || 
                                         (j.MaxSalary.HasValue && j.MaxSalary >= request.MinSalary.Value));
        }

        if (request.MaxSalary.HasValue)
        {
            dbQuery = dbQuery.Where(j => (j.MaxSalary.HasValue && j.MaxSalary <= request.MaxSalary.Value) || 
                                         (j.MinSalary.HasValue && j.MinSalary <= request.MaxSalary.Value));
        }

        if (!string.IsNullOrWhiteSpace(request.BoardAffiliation))
        {
            var lowerBoard = request.BoardAffiliation.ToLower();
            dbQuery = dbQuery.Where(j => (j.BoardAffiliation != null && j.BoardAffiliation.ToLower().Contains(lowerBoard)) ||
                                         (j.Keywords.ToLower().Contains(lowerBoard)));
        }

        if (!string.IsNullOrWhiteSpace(request.WorkMode))
        {
            var lowerMode = request.WorkMode.ToLower();
            dbQuery = dbQuery.Where(j => j.WorkMode != null && j.WorkMode.ToLower() == lowerMode);
        }

        if (request.PostedWithinDays.HasValue && request.PostedWithinDays.Value > 0)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-request.PostedWithinDays.Value);
            dbQuery = dbQuery.Where(j => j.CreatedAt >= cutoffDate);
        }

        var totalRecords = await dbQuery.CountAsync();

        var queryOrdered = request.SortBy?.ToLower() switch
        {
            "salary" => dbQuery.OrderByDescending(j => j.MaxSalary ?? j.MinSalary ?? 0),
            "date" => dbQuery.OrderByDescending(j => j.CreatedAt),
            _ => dbQuery.OrderByDescending(j => j.IsPlatinum).ThenByDescending(j => j.CreatedAt)
        };

        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 100);

        var pagedJobs = await queryOrdered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var results = pagedJobs.Select(j => new JobDto
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
            ScreeningQuestionsJson = j.ScreeningQuestionsJson,
            WorkMode = j.WorkMode,
            BoardAffiliation = j.BoardAffiliation,
            SubjectDepartment = j.SubjectDepartment,
            InstitutionLogoUrl = j.Institution != null ? j.Institution.LogoUrl : null
        }).ToList();

        if (candidateId.HasValue)
        {
            var appliedJobIds = await _context.JobApplications
                .Where(ja => ja.CandidateId == candidateId.Value)
                .Select(ja => ja.JobId)
                .ToListAsync();

            foreach (var j in results)
            {
                j.IsApplied = appliedJobIds.Contains(j.Id);
            }
        }

        return new MyNaukri.Application.DTOs.SuperAdmin.PaginatedResultDto<JobDto>
        {
            Items = results,
            Page = page,
            PageSize = pageSize,
            TotalRecords = totalRecords
        };
    }

    public async Task<IEnumerable<CandidateSearchResultDto>> SearchCandidatesAsync(CandidateSearchRequestDto request)
    {
        var dbQuery = _context.Candidates
            .Include(c => c.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            dbQuery = ApplyKeywordFilter(dbQuery, request.Keyword);
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

        if (!string.IsNullOrWhiteSpace(request.NoticePeriod))
        {
            var lowerNotice = request.NoticePeriod.ToLower();
            dbQuery = dbQuery.Where(c => c.NoticePeriod != null && c.NoticePeriod.ToLower().Contains(lowerNotice));
        }

        if (!string.IsNullOrWhiteSpace(request.ClassesTaught))
        {
            var lowerClasses = request.ClassesTaught.ToLower();
            dbQuery = dbQuery.Where(c => c.ClassesTaught != null && c.ClassesTaught.ToLower().Contains(lowerClasses));
        }

        if (!string.IsNullOrWhiteSpace(request.BoardsTaught))
        {
            var lowerBoards = request.BoardsTaught.ToLower();
            dbQuery = dbQuery.Where(c => c.BoardsTaught != null && c.BoardsTaught.ToLower().Contains(lowerBoards));
        }

        if (request.IsCtetQualified.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.IsCtetQualified == request.IsCtetQualified.Value);
        }

        if (request.MinExpectedSalary.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.ExpectedSalary.HasValue && c.ExpectedSalary >= request.MinExpectedSalary.Value);
        }

        if (request.MaxExpectedSalary.HasValue)
        {
            dbQuery = dbQuery.Where(c => c.ExpectedSalary.HasValue && c.ExpectedSalary <= request.MaxExpectedSalary.Value);
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

        if (request.VerifiedDemoOnly == true)
        {
            dbQuery = dbQuery.Where(c => c.DemoVideoStatus == VideoVerificationStatus.Verified);
        }

        if (request.LastUpdatedDays.HasValue && request.LastUpdatedDays.Value > 0)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-request.LastUpdatedDays.Value);
            dbQuery = dbQuery.Where(c => (c.UpdatedAt ?? c.CreatedAt) >= cutoffDate);
        }

        var candidates = await dbQuery
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .Take(100)
            .ToListAsync();

        var dtoList = candidates.Select(c =>
        {
            var (aiScore, aiReason) = CalculateAiRecommendation(c, request);
            return new CandidateSearchResultDto
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
                ExServicemanBranch = c.ExServicemanBranch,
                NoticePeriod = c.NoticePeriod,
                ClassesTaught = c.ClassesTaught,
                BoardsTaught = c.BoardsTaught,
                IsCtetQualified = c.IsCtetQualified,
                DemoVideoUrl = c.DemoVideoUrl,
                DemoVideoStatus = c.DemoVideoStatus.ToString(),
                DemoVideoSubject = c.DemoVideoSubject,
                DemoVideoSummary = c.DemoVideoSummary,
                JoiningAvailability = c.JoiningAvailability,
                UpdatedAt = c.UpdatedAt ?? c.CreatedAt,
                AiRecommendationScore = aiScore,
                AiRecommendationReason = aiReason
            };
        }).ToList();

        // Apply Sorting
        var sortBy = (request.SortBy ?? "").Trim().ToLowerInvariant();
        if (sortBy == "experience")
        {
            dtoList = dtoList.OrderByDescending(d => d.TotalExperienceYears)
                             .ThenByDescending(d => d.AiRecommendationScore ?? 0)
                             .ToList();
        }
        else if (sortBy == "lastupdated")
        {
            dtoList = dtoList.OrderByDescending(d => d.UpdatedAt)
                             .ThenByDescending(d => d.AiRecommendationScore ?? 0)
                             .ToList();
        }
        else if (sortBy == "aimatch" || !string.IsNullOrWhiteSpace(request.Keyword) || !string.IsNullOrWhiteSpace(request.Location) || request.MinExperienceYears.HasValue || request.MaxExperienceYears.HasValue)
        {
            // Default to AI recommendation score when active criteria or explicit "aiMatch" requested
            dtoList = dtoList.OrderByDescending(d => d.AiRecommendationScore ?? 0)
                             .ThenByDescending(d => d.UpdatedAt)
                             .ToList();
        }
        else
        {
            // Default when no criteria: order by most recently updated
            dtoList = dtoList.OrderByDescending(d => d.UpdatedAt)
                             .ToList();
        }

        return dtoList;
    }

    /// <summary>
    /// Calculates a weighted, semantic AI recommendation score (15 - 100%) and recruiter-friendly reasoning
    /// based on how well the candidate profile matches the provided search criteria.
    /// </summary>
    public static (decimal Score, string Reason) CalculateAiRecommendation(Candidate c, CandidateSearchRequestDto request)
    {
        decimal totalScore = 0;
        var highlights = new List<string>();

        // 1. Skill & Keyword Alignment (Max: 40 points)
        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var rawTokens = request.Keyword
                .Split(new[] { ',', ';', '/', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => t.ToLowerInvariant())
                .Distinct()
                .Where(t => t.Length > 1)
                .ToList();

            if (rawTokens.Count > 0)
            {
                var skillsText = (c.Skills ?? "").ToLowerInvariant();
                var summaryText = (c.Summary ?? "").ToLowerInvariant();
                var eduText = (c.Education ?? "").ToLowerInvariant();
                var classesText = (c.ClassesTaught ?? "").ToLowerInvariant();
                var boardsText = (c.BoardsTaught ?? "").ToLowerInvariant();
                var demoSubj = (c.DemoVideoSubject ?? "").ToLowerInvariant();

                int matchedCount = 0;
                var matchedKeywords = new List<string>();

                foreach (var token in rawTokens)
                {
                    if (skillsText.Contains(token) || demoSubj.Contains(token))
                    {
                        matchedCount++;
                        matchedKeywords.Add(token);
                    }
                    else if (classesText.Contains(token) || boardsText.Contains(token) || summaryText.Contains(token) || eduText.Contains(token))
                    {
                        matchedCount++;
                        matchedKeywords.Add(token);
                    }
                }

                decimal matchRatio = (decimal)matchedCount / rawTokens.Count;
                decimal keywordScore = matchRatio * 40m;
                totalScore += keywordScore;

                if (matchedKeywords.Count > 0)
                {
                    highlights.Add($"Keywords: {string.Join(", ", matchedKeywords.Take(3))}");
                }
            }
            else
            {
                totalScore += 25m;
            }
        }
        else
        {
            // Baseline score based on profile richness
            decimal baseline = 20m;
            if (!string.IsNullOrWhiteSpace(c.Skills)) baseline += 10m;
            if (!string.IsNullOrWhiteSpace(c.Summary)) baseline += 5m;
            if (!string.IsNullOrWhiteSpace(c.Education)) baseline += 5m;
            totalScore += baseline;
        }

        // 2. Experience Fit (Max: 25 points)
        if (request.MinExperienceYears.HasValue || request.MaxExperienceYears.HasValue)
        {
            int minExp = request.MinExperienceYears ?? 0;
            int maxExp = request.MaxExperienceYears ?? int.MaxValue;
            int candidateExp = c.TotalExperienceYears;

            if (candidateExp >= minExp && candidateExp <= maxExp)
            {
                totalScore += 25m;
                highlights.Add($"Exp: {candidateExp} yrs (In Target Range)");
            }
            else if (candidateExp < minExp)
            {
                int diff = minExp - candidateExp;
                decimal expScore = diff == 1 ? 18m : diff == 2 ? 12m : 6m;
                totalScore += expScore;
                highlights.Add($"Exp: {candidateExp} yrs (Target: {minExp}+ yrs)");
            }
            else // candidateExp > maxExp
            {
                int diff = candidateExp - maxExp;
                decimal expScore = diff <= 2 ? 20m : 15m;
                totalScore += expScore;
                highlights.Add($"Exp: {candidateExp} yrs (Senior to target)");
            }
        }
        else
        {
            // Baseline experience score (up to 25 points)
            decimal expScore = Math.Min(25m, 12m + (c.TotalExperienceYears * 2m));
            totalScore += expScore;
            if (c.TotalExperienceYears > 0)
            {
                highlights.Add($"Exp: {c.TotalExperienceYears} yrs");
            }
        }

        // 3. Location Relevance (Max: 15 points)
        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            var targetLoc = request.Location.Trim().ToLowerInvariant();
            var currLoc = (c.CurrentLocation ?? "").ToLowerInvariant();
            var prefLocs = (c.PreferredLocations ?? "").ToLowerInvariant();

            if (currLoc.Contains(targetLoc) || targetLoc.Contains(currLoc))
            {
                totalScore += 15m;
                highlights.Add($"Location: {c.CurrentLocation}");
            }
            else if (prefLocs.Contains(targetLoc))
            {
                totalScore += 12m;
                highlights.Add($"Prefers: {request.Location}");
            }
            else
            {
                totalScore += 2m;
            }
        }
        else
        {
            totalScore += 10m; // baseline
            if (!string.IsNullOrWhiteSpace(c.CurrentLocation))
            {
                highlights.Add($"Location: {c.CurrentLocation}");
            }
        }

        // 4. Teaching Level & Board Fit (Max: 10 points)
        if (!string.IsNullOrWhiteSpace(request.BoardsTaught) || !string.IsNullOrWhiteSpace(request.ClassesTaught))
        {
            int fitPoints = 0;
            if (!string.IsNullOrWhiteSpace(request.BoardsTaught) && (c.BoardsTaught ?? "").ToLowerInvariant().Contains(request.BoardsTaught.Trim().ToLowerInvariant()))
            {
                fitPoints += 5;
                highlights.Add($"Board: {request.BoardsTaught}");
            }
            if (!string.IsNullOrWhiteSpace(request.ClassesTaught) && (c.ClassesTaught ?? "").ToLowerInvariant().Contains(request.ClassesTaught.Trim().ToLowerInvariant()))
            {
                fitPoints += 5;
                highlights.Add($"Classes: {request.ClassesTaught}");
            }
            totalScore += fitPoints > 0 ? fitPoints : 3m;
        }
        else
        {
            decimal boardPoints = 5m;
            if (!string.IsNullOrWhiteSpace(c.BoardsTaught)) boardPoints += 3m;
            if (!string.IsNullOrWhiteSpace(c.ClassesTaught)) boardPoints += 2m;
            totalScore += boardPoints;
        }

        // 5. Verified Quality & Readiness Bonus (Max: 10 points)
        if (c.DemoVideoStatus == VideoVerificationStatus.Verified)
        {
            totalScore += 5m;
            highlights.Add("AI Verified Demo");
        }
        if (c.IsCtetQualified == true)
        {
            totalScore += 3m;
            highlights.Add("CTET Certified");
        }
        if (!string.IsNullOrWhiteSpace(c.NoticePeriod) && 
            (c.NoticePeriod.Contains("Immediate", StringComparison.OrdinalIgnoreCase) || c.NoticePeriod.Contains("15", StringComparison.OrdinalIgnoreCase)))
        {
            totalScore += 2m;
            highlights.Add("Quick Joining");
        }

        // Final clamp and rounding
        decimal finalScore = Math.Clamp(Math.Round(totalScore, 0), 15m, 100m);
        string reason = highlights.Count > 0 ? string.Join(" • ", highlights) : "Profile matching criteria";

        return (finalScore, reason);
    }

    private static IQueryable<Candidate> ApplyKeywordFilter(IQueryable<Candidate> query, string keyword)
    {
        var tokens = keyword
            .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => t.ToLower())
            .Where(t => t.Length > 0)
            .Distinct()
            .ToList();

        if (tokens.Count == 0) return query;

        var parameter = System.Linq.Expressions.Expression.Parameter(typeof(Candidate), "c");
        System.Linq.Expressions.Expression? combined = null;

        var toLowerMethod = typeof(string).GetMethod("ToLower", Type.EmptyTypes)!;
        var containsMethod = typeof(string).GetMethod("Contains", new[] { typeof(string) })!;

        foreach (var token in tokens)
        {
            var tokenConst = System.Linq.Expressions.Expression.Constant(token);

            // c.Skills.ToLower().Contains(token)
            var skillsProp = System.Linq.Expressions.Expression.Property(parameter, nameof(Candidate.Skills));
            var skillsLower = System.Linq.Expressions.Expression.Call(skillsProp, toLowerMethod);
            var skillsContains = System.Linq.Expressions.Expression.Call(skillsLower, containsMethod, tokenConst);

            // c.Summary.ToLower().Contains(token)
            var summaryProp = System.Linq.Expressions.Expression.Property(parameter, nameof(Candidate.Summary));
            var summaryLower = System.Linq.Expressions.Expression.Call(summaryProp, toLowerMethod);
            var summaryContains = System.Linq.Expressions.Expression.Call(summaryLower, containsMethod, tokenConst);

            // c.Education.ToLower().Contains(token)
            var eduProp = System.Linq.Expressions.Expression.Property(parameter, nameof(Candidate.Education));
            var eduLower = System.Linq.Expressions.Expression.Call(eduProp, toLowerMethod);
            var eduContains = System.Linq.Expressions.Expression.Call(eduLower, containsMethod, tokenConst);

            // c.ClassesTaught != null && c.ClassesTaught.ToLower().Contains(token)
            var classesProp = System.Linq.Expressions.Expression.Property(parameter, nameof(Candidate.ClassesTaught));
            var classesNotNull = System.Linq.Expressions.Expression.NotEqual(classesProp, System.Linq.Expressions.Expression.Constant(null, typeof(string)));
            var classesLower = System.Linq.Expressions.Expression.Call(classesProp, toLowerMethod);
            var classesContains = System.Linq.Expressions.Expression.AndAlso(classesNotNull, System.Linq.Expressions.Expression.Call(classesLower, containsMethod, tokenConst));

            // c.BoardsTaught != null && c.BoardsTaught.ToLower().Contains(token)
            var boardsProp = System.Linq.Expressions.Expression.Property(parameter, nameof(Candidate.BoardsTaught));
            var boardsNotNull = System.Linq.Expressions.Expression.NotEqual(boardsProp, System.Linq.Expressions.Expression.Constant(null, typeof(string)));
            var boardsLower = System.Linq.Expressions.Expression.Call(boardsProp, toLowerMethod);
            var boardsContains = System.Linq.Expressions.Expression.AndAlso(boardsNotNull, System.Linq.Expressions.Expression.Call(boardsLower, containsMethod, tokenConst));

            // c.User.FirstName.ToLower().Contains(token)
            var userProp = System.Linq.Expressions.Expression.Property(parameter, nameof(Candidate.User));
            var firstProp = System.Linq.Expressions.Expression.Property(userProp, nameof(User.FirstName));
            var firstLower = System.Linq.Expressions.Expression.Call(firstProp, toLowerMethod);
            var firstContains = System.Linq.Expressions.Expression.Call(firstLower, containsMethod, tokenConst);

            // c.User.LastName.ToLower().Contains(token)
            var lastProp = System.Linq.Expressions.Expression.Property(userProp, nameof(User.LastName));
            var lastLower = System.Linq.Expressions.Expression.Call(lastProp, toLowerMethod);
            var lastContains = System.Linq.Expressions.Expression.Call(lastLower, containsMethod, tokenConst);

            var tokenExpr = System.Linq.Expressions.Expression.OrElse(skillsContains, summaryContains);
            tokenExpr = System.Linq.Expressions.Expression.OrElse(tokenExpr, eduContains);
            tokenExpr = System.Linq.Expressions.Expression.OrElse(tokenExpr, classesContains);
            tokenExpr = System.Linq.Expressions.Expression.OrElse(tokenExpr, boardsContains);
            tokenExpr = System.Linq.Expressions.Expression.OrElse(tokenExpr, firstContains);
            tokenExpr = System.Linq.Expressions.Expression.OrElse(tokenExpr, lastContains);

            combined = combined == null ? tokenExpr : System.Linq.Expressions.Expression.OrElse(combined, tokenExpr);
        }

        var lambda = System.Linq.Expressions.Expression.Lambda<Func<Candidate, bool>>(combined!, parameter);
        return query.Where(lambda);
    }

    public async Task<IEnumerable<CandidateSearchResultDto>> GetAiMatchedCandidatesForJobAsync(Guid jobId, Guid? recruiterId = null)
    {
        var job = await _context.Jobs
            .Include(j => j.Institution)
            .FirstOrDefaultAsync(j => j.Id == jobId);

        if (job == null)
        {
            return Enumerable.Empty<CandidateSearchResultDto>();
        }

        // Build candidate search request from job parameters
        var keywordsList = new List<string>();
        if (!string.IsNullOrWhiteSpace(job.Title)) keywordsList.Add(job.Title);
        if (!string.IsNullOrWhiteSpace(job.Keywords)) keywordsList.Add(job.Keywords);
        if (!string.IsNullOrWhiteSpace(job.SubjectDepartment)) keywordsList.Add(job.SubjectDepartment);

        var searchRequest = new CandidateSearchRequestDto
        {
            Keyword = string.Join(", ", keywordsList),
            Location = job.Location ?? string.Empty,
            BoardsTaught = job.BoardAffiliation,
            ClassesTaught = job.SubjectDepartment,
            SortBy = "aiMatch"
        };

        var candidates = await _context.Candidates
            .Include(c => c.User)
            .ToListAsync();

        if (!candidates.Any())
        {
            return Enumerable.Empty<CandidateSearchResultDto>();
        }

        var candidateIds = candidates.Select(c => c.Id).ToList();
        Dictionary<Guid, CandidateContactAccess> accesses = new();
        if (recruiterId.HasValue)
        {
            accesses = await _context.CandidateContactAccesses
                .Where(a => a.RecruiterId == recruiterId.Value && candidateIds.Contains(a.CandidateId))
                .ToDictionaryAsync(a => a.CandidateId);
        }

        var dtoList = candidates.Select(c =>
        {
            var (aiScore, aiReason) = CalculateAiRecommendation(c, searchRequest);

            bool hasUnlockedContact = accesses.TryGetValue(c.Id, out var access) && access.HasUnlockedContact;
            bool hasDownloadedResume = access != null && access.HasDownloadedResume;

            return new CandidateSearchResultDto
            {
                Id = c.Id,
                FirstName = hasUnlockedContact ? c.User.FirstName : (string.IsNullOrEmpty(c.User.FirstName) ? "Candidate" : c.User.FirstName.Substring(0, 1) + "***"),
                LastName = hasUnlockedContact ? c.User.LastName : (string.IsNullOrEmpty(c.User.LastName) ? "" : c.User.LastName.Substring(0, 1) + "***"),
                Email = hasUnlockedContact ? c.User.Email : MaskEmail(c.User.Email),
                PhoneNumber = hasUnlockedContact ? c.PhoneNumber : MaskPhone(c.PhoneNumber),
                ResumeUrl = hasDownloadedResume ? c.ResumeUrl : null,
                Skills = c.Skills,
                Summary = c.Summary,
                TotalExperienceYears = c.TotalExperienceYears,
                CurrentLocation = c.CurrentLocation,
                Education = c.Education,
                Gender = c.Gender,
                DifferentlyAbled = c.DifferentlyAbled,
                ExServiceman = c.ExServiceman,
                ExServicemanBranch = c.ExServicemanBranch,
                NoticePeriod = c.NoticePeriod,
                ClassesTaught = c.ClassesTaught,
                BoardsTaught = c.BoardsTaught,
                IsCtetQualified = c.IsCtetQualified,
                DemoVideoUrl = c.DemoVideoUrl,
                DemoVideoStatus = c.DemoVideoStatus.ToString(),
                DemoVideoSubject = c.DemoVideoSubject,
                DemoVideoSummary = c.DemoVideoSummary,
                JoiningAvailability = c.JoiningAvailability,
                UpdatedAt = c.UpdatedAt ?? c.CreatedAt,
                HasUnlockedContact = hasUnlockedContact,
                HasDownloadedResume = hasDownloadedResume,
                AiRecommendationScore = aiScore,
                AiRecommendationReason = aiReason
            };
        })
        .OrderByDescending(c => c.AiRecommendationScore ?? 0)
        .ThenByDescending(c => c.UpdatedAt)
        .ToList();

        return dtoList;
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

    private static string MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        return phone.Length > 4 
            ? phone.Substring(0, 2) + "******" + phone.Substring(phone.Length - 2) 
            : "******";
    }
}
