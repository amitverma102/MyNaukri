using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text;
using System.IO;
using System.IO.Compression;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using UglyToad.PdfPig;
using MyNaukri.Domain.Entities;

namespace MyNaukri.Infrastructure.Services;

public class DbAiService : IAiService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<DbAiService> _logger;
    private readonly HttpClient _httpClient;

    public DbAiService(ApplicationDbContext context, IConfiguration config, ILogger<DbAiService> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient();
    }

    public async Task<ParsedResumeDto> ParseResumeAsync(byte[] resumeData, string fileName)
    {
        string text = "";
        try
        {
            if (fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                using var document = PdfDocument.Open(resumeData);
                foreach (var page in document.GetPages())
                {
                    text += page.Text + " ";
                }
            }
            else
            {
                text = "File is not a PDF.";
            }
        }
        catch (Exception)
        {
            text = "Failed to parse document text.";
        }

        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
        {
            return new ParsedResumeDto 
            {
                Skills = "C#, .NET (Mock - No API Key)",
                PhoneNumber = "+91 0000000000",
                TotalExperienceYears = 0
            };
        }

        var prompt = $@"
You are an expert resume parser for the education sector. Extract the following information from the text below:
1. Skills: A comma-separated list of technical and soft skills.
2. PhoneNumber: The candidate's phone number.
3. TotalExperienceYears: An integer representing the total years of professional experience.
4. CurrentLocation: The candidate's current city/location.
5. ClassesTaught: A comma-separated list of school classes or grades taught (e.g. 10th, 12th, Primary).
6. BoardsTaught: A comma-separated list of education boards taught (e.g. CBSE, ICSE, State Board).
7. Education: The candidate's highest educational degree (e.g. B.Ed, M.Sc).
8. Certifications: A comma-separated list of professional certifications.

Respond ONLY with a valid JSON object matching this schema exactly, and nothing else (leave fields empty if not found):
{{
  ""skills"": ""string"",
  ""phoneNumber"": ""string"",
  ""totalExperienceYears"": 0,
  ""currentLocation"": ""string"",
  ""classesTaught"": ""string"",
  ""boardsTaught"": ""string"",
  ""education"": ""string"",
  ""certifications"": ""string""
}}

Resume Text:
{text}";

        var modelName = _config["Gemini:ModelName"] ?? "gemini-3.5-flash";
        var method = _config["Gemini:Method"] ?? "generateContent";

        var requestBody = new
        {
            contents = new[]
            {
                new 
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 8192
            }
        };

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:{method}?key={apiKey}")
        {
            Content = JsonContent.Create(requestBody)
        };
        requestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var responseMessage = await _httpClient.SendAsync(requestMessage);
            var responseBody = await responseMessage.Content.ReadAsStringAsync();

            if (!responseMessage.IsSuccessStatusCode)
            {
                _logger.LogWarning("Resume parse GenAI call failed with status {StatusCode}: {ResponseBody}", responseMessage.StatusCode, responseBody);
                return GetFallbackParseResult();
            }

            var result = TryParseGenAiResponse(responseBody);
            if (result != null)
            {
                return result;
            }

            _logger.LogWarning("Resume parse GenAI response could not be deserialized from response body: {ResponseBody}", responseBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while calling GenAI resume parser");
        }

        return GetFallbackParseResult();
    }

    private ParsedResumeDto GetFallbackParseResult()
    {
        return new ParsedResumeDto
        {
            Skills = "Parsing Failed",
            PhoneNumber = string.Empty,
            TotalExperienceYears = 0,
            CurrentLocation = string.Empty,
            ClassesTaught = string.Empty,
            BoardsTaught = string.Empty,
            Education = string.Empty,
            Certifications = string.Empty
        };
    }

    private ParsedResumeDto? TryParseGenAiResponse(string jsonResponse)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonResponse);
            var textResult = ExtractTextFromGenAiResponse(doc.RootElement);
            if (string.IsNullOrWhiteSpace(textResult))
            {
                return null;
            }

            var jsonBody = ExtractJsonBody(textResult);
            if (string.IsNullOrWhiteSpace(jsonBody))
            {
                return null;
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<ParsedResumeDto>(jsonBody, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize GenAI resume parser response.");
            return null;
        }
    }

    private static string? ExtractTextFromGenAiResponse(JsonElement root)
    {
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.ValueKind != JsonValueKind.Array || candidates.GetArrayLength() == 0)
        {
            return null;
        }

        var candidate = candidates[0];
        if (candidate.TryGetProperty("content", out var content))
        {
            if (content.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in content.EnumerateArray())
                {
                    if (item.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                    {
                        return textProp.GetString();
                    }

                    if (item.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
                    {
                        var part = parts[0];
                        if (part.TryGetProperty("text", out var partText) && partText.ValueKind == JsonValueKind.String)
                        {
                            return partText.GetString();
                        }
                    }
                }
            }
            else if (content.ValueKind == JsonValueKind.Object)
            {
                if (content.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                {
                    return textProp.GetString();
                }

                if (content.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
                {
                    var part = parts[0];
                    if (part.TryGetProperty("text", out var partText) && partText.ValueKind == JsonValueKind.String)
                    {
                        return partText.GetString();
                    }
                }
            }
        }

        if (candidate.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.Array && output.GetArrayLength() > 0)
        {
            var firstOutput = output[0];
            if (firstOutput.TryGetProperty("content", out var contentOutput) && contentOutput.ValueKind == JsonValueKind.Array && contentOutput.GetArrayLength() > 0)
            {
                var firstContent = contentOutput[0];
                if (firstContent.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                {
                    return textProp.GetString();
                }
            }
        }

        return null;
    }

    private static string? ExtractJsonBody(string text)
    {
        text = RemoveMarkdownCodeFences(text).Trim();

        var json = FindJsonObject(text);
        return string.IsNullOrWhiteSpace(json) ? null : json;
    }

    private static string RemoveMarkdownCodeFences(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;

        text = text.Trim();

        if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            text = text.Substring(7).Trim();
        }
        else if (text.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            text = text.Substring(3).Trim();
        }

        if (text.EndsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            text = text[..^3].Trim();
        }

        if (text.StartsWith("`"))
        {
            text = text.Trim('`').Trim();
        }

        return text;
    }

    private static string? FindJsonObject(string text)
    {
        var start = text.IndexOf('{');
        if (start < 0) return null;

        bool inString = false;
        bool escape = false;
        int depth = 0;

        for (int i = start; i < text.Length; i++)
        {
            var ch = text[i];

            if (escape)
            {
                escape = false;
                continue;
            }

            if (ch == '\\')
            {
                escape = true;
                continue;
            }

            if (ch == '"')
            {
                inString = !inString;
                continue;
            }

            if (inString) continue;

            if (ch == '{')
            {
                depth++;
            }
            else if (ch == '}')
            {
                depth--;
                if (depth == 0)
                {
                    return text[start..(i + 1)];
                }
            }
        }

        return null;
    }

    public async Task<IEnumerable<JobDto>> GetJobRecommendationsAsync(Guid candidateId)
    {
        // Fetch candidate to get their skills
        var candidate = await _context.Candidates
            .FirstOrDefaultAsync(c => c.Id == candidateId);

        if (candidate == null || string.IsNullOrWhiteSpace(candidate.Skills))
        {
            // Return empty if candidate doesn't exist or has no skills to match
            return new List<JobDto>();
        }

        // Parse candidate skills into a list of lowercase keywords
        var candidateSkills = candidate.Skills
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim().ToLower())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        if (!candidateSkills.Any())
        {
            return new List<JobDto>();
        }

        // Fetch all active jobs
        var allJobs = await _context.Jobs
            .Include(j => j.Institution)
            .Where(j => j.IsActive)
            .ToListAsync();

        var appliedJobIds = await _context.JobApplications
            .Where(ja => ja.CandidateId == candidateId)
            .Select(ja => ja.JobId)
            .ToListAsync();

        var scoredJobs = new List<(JobDto Job, int Score)>();

        foreach (var job in allJobs)
        {
            int score = 0;
            var searchableText = $"{job.Title} {job.Description} {job.Requirements}".ToLower();

            foreach (var skill in candidateSkills)
            {
                if (searchableText.Contains(skill))
                {
                    score++;
                }
            }

            if (score > 0)
            {
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
                    IsActive = job.IsActive,
                    RecruiterId = job.RecruiterId,
                    InstitutionId = job.InstitutionId,
                    CreatedAt = job.CreatedAt,
                    CompanyName = job.Institution?.Name ?? string.Empty,
                    InstitutionLogoUrl = job.Institution?.LogoUrl,
                    IsApplied = appliedJobIds.Contains(job.Id)
                };
                
                scoredJobs.Add((dto, score));
            }
        }

        // Sort by score descending and return top 10
        return scoredJobs
            .OrderByDescending(j => j.Score)
            .Take(10)
            .Select(j => j.Job);
    }

    public async Task<JobResumeComparisonDto> CompareResumeWithJobAsync(Guid candidateId, Guid jobId)
    {
        var candidate = await _context.Candidates
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == candidateId);

        var job = await _context.Jobs
            .Include(j => j.Institution)
            .FirstOrDefaultAsync(j => j.Id == jobId);

        if (candidate == null || job == null)
        {
            return new JobResumeComparisonDto
            {
                JobId = jobId,
                JobTitle = job?.Title ?? "Unknown Job",
                CompanyName = job?.Institution?.Name ?? string.Empty,
                MatchScore = 50,
                FitLevel = "Moderate",
                MatchSummary = "Could not locate candidate profile or job posting for detailed analysis."
            };
        }

        var prompt = $@"
You are an expert Applicant Tracking System (ATS) and educator recruitment specialist.
Evaluate the compatibility between the candidate's resume/profile and the target educational Job Description.

=== CANDIDATE PROFILE ===
Name: {candidate.User?.FirstName} {candidate.User?.LastName}
Skills: {candidate.Skills}
Summary: {candidate.Summary}
Total Experience: {candidate.TotalExperienceYears} years
Current Location: {candidate.CurrentLocation}
Preferred Locations: {candidate.PreferredLocations}
Classes Taught: {candidate.ClassesTaught}
Boards Taught: {candidate.BoardsTaught}
Highest Education: {candidate.Education}
Certifications: {candidate.Certifications}
Current Institution: {candidate.CurrentInstitution}

=== TARGET JOB OPENING ===
Title: {job.Title}
Institution: {job.Institution?.Name}
Location: {job.Location}
Work Mode: {job.WorkMode}
Board Affiliation: {job.BoardAffiliation}
Subject/Department: {job.SubjectDepartment}
Description: {job.Description}
Requirements: {job.Requirements}

=== INSTRUCTIONS ===
Analyze the candidate's fitment for this role. Respond ONLY with a valid JSON object matching this schema:
{{
  ""matchScore"": 85,
  ""fitLevel"": ""High"",
  ""matchSummary"": ""Concise 1-2 sentence overall fitment verdict."",
  ""matchedSkills"": [""Skill A"", ""Skill B""],
  ""missingSkills"": [""Skill C"", ""Skill D""],
  ""experienceMatch"": {{
    ""required"": ""e.g. 3-5 years"",
    ""candidate"": ""{candidate.TotalExperienceYears} years"",
    ""isMatch"": true,
    ""notes"": ""Brief note on experience alignment.""
  }},
  ""educationMatch"": {{
    ""required"": ""e.g. B.Ed, M.Sc"",
    ""candidate"": ""{candidate.Education}"",
    ""isMatch"": true,
    ""notes"": ""Brief note on degree alignment.""
  }},
  ""locationMatch"": {{
    ""jobLocation"": ""{job.Location}"",
    ""candidateLocation"": ""{candidate.CurrentLocation}"",
    ""isMatch"": true,
    ""notes"": ""Commute / relocation notes.""
  }},
  ""strengths"": [""Strength 1"", ""Strength 2"", ""Strength 3""],
  ""improvementSuggestions"": [""Actionable tip 1"", ""Actionable tip 2""]
}}";

        var result = await CallGeminiAndDeserializeAsync<JobResumeComparisonDto>(prompt);
        if (result != null && result.MatchScore > 0)
        {
            result.JobId = job.Id;
            result.JobTitle = job.Title;
            result.CompanyName = job.Institution?.Name ?? string.Empty;
            return result;
        }

        return GenerateFallbackComparison(candidate, job);
    }

    public async Task<TailoredResumeDto> TailorResumeForJobAsync(Guid candidateId, Guid jobId)
    {
        var candidate = await _context.Candidates
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == candidateId);

        var job = await _context.Jobs
            .Include(j => j.Institution)
            .FirstOrDefaultAsync(j => j.Id == jobId);

        if (candidate == null || job == null)
        {
            return new TailoredResumeDto
            {
                JobId = jobId,
                JobTitle = job?.Title ?? "Unknown Job",
                TailoredHeadline = "Educator Profile",
                TailoredSummary = "Profile not found."
            };
        }

        var prompt = $@"
You are an elite career coach and resume writer for educators and school faculty.
Tailor the candidate's resume content specifically for the target job opening, ensuring maximum ATS compatibility and recruiter appeal.
Maintain factual honesty based on the candidate's background while highlighting relevant pedagogical achievements, keywords, and qualifications.

=== CANDIDATE PROFILE ===
Name: {candidate.User?.FirstName} {candidate.User?.LastName}
Skills: {candidate.Skills}
Summary: {candidate.Summary}
Total Experience: {candidate.TotalExperienceYears} years
Classes Taught: {candidate.ClassesTaught}
Boards Taught: {candidate.BoardsTaught}
Highest Education: {candidate.Education}
Certifications: {candidate.Certifications}

=== TARGET JOB OPENING ===
Title: {job.Title}
Institution: {job.Institution?.Name}
Location: {job.Location}
Board Affiliation: {job.BoardAffiliation}
Subject/Department: {job.SubjectDepartment}
Description: {job.Description}
Requirements: {job.Requirements}

=== INSTRUCTIONS ===
Generate tailored resume assets. Respond ONLY with a valid JSON object matching this schema:
{{
  ""tailoredHeadline"": ""Impactful one-line headline tailored to this position"",
  ""tailoredSummary"": ""3-4 sentence compelling summary highlighting relevant skills and board experience"",
  ""tailoredBulletPoints"": [
    ""Action-oriented achievement bullet point 1 with measurable outcomes"",
    ""Action-oriented achievement bullet point 2"",
    ""Action-oriented achievement bullet point 3""
  ],
  ""recommendedSkillsToAdd"": [""Key skill 1 from JD"", ""Key skill 2""],
  ""coverNotePitch"": ""Personalized 2-3 paragraph cover note/application pitch to the hiring team""
}}";

        var result = await CallGeminiAndDeserializeAsync<TailoredResumeDto>(prompt);
        if (result != null && !string.IsNullOrWhiteSpace(result.TailoredSummary))
        {
            result.JobId = job.Id;
            result.JobTitle = job.Title;
            return result;
        }

        return GenerateFallbackTailoredResume(candidate, job);
    }

    private async Task<T?> CallGeminiAndDeserializeAsync<T>(string prompt) where T : class
    {
        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
        {
            return null;
        }

        var modelName = _config["Gemini:ModelName"] ?? "gemini-3.5-flash";
        var method = _config["Gemini:Method"] ?? "generateContent";

        var requestBody = new
        {
            contents = new[]
            {
                new 
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 8192
            }
        };

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:{method}?key={apiKey}")
        {
            Content = JsonContent.Create(requestBody)
        };
        requestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var responseMessage = await _httpClient.SendAsync(requestMessage);
            var responseBody = await responseMessage.Content.ReadAsStringAsync();

            if (!responseMessage.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini API call failed with status {StatusCode}: {ResponseBody}", responseMessage.StatusCode, responseBody);
                return null;
            }

            using var doc = JsonDocument.Parse(responseBody);
            var textResult = ExtractTextFromGenAiResponse(doc.RootElement);
            if (string.IsNullOrWhiteSpace(textResult)) return null;

            var jsonBody = ExtractJsonBody(textResult);
            if (string.IsNullOrWhiteSpace(jsonBody)) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<T>(jsonBody, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Exception calling or deserializing Gemini response");
            return null;
        }
    }

    private JobResumeComparisonDto GenerateFallbackComparison(Candidate candidate, Job job)
    {
        var candidateSkills = (candidate.Skills ?? "")
            .Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        var jobText = $"{job.Title} {job.Description} {job.Requirements} {job.BoardAffiliation} {job.SubjectDepartment}".ToLower();
        
        var matchedSkills = new List<string>();
        foreach (var skill in candidateSkills)
        {
            if (jobText.Contains(skill.ToLower()))
            {
                matchedSkills.Add(skill);
            }
        }

        // Identify common educational skills missing
        var potentialJobSkills = new List<string>();
        if (!string.IsNullOrWhiteSpace(job.SubjectDepartment)) potentialJobSkills.Add(job.SubjectDepartment);
        if (!string.IsNullOrWhiteSpace(job.BoardAffiliation)) potentialJobSkills.Add(job.BoardAffiliation);
        potentialJobSkills.AddRange(new[] { "Curriculum Design", "Classroom Management", "Formative Assessment", "Smartboard Pedagogy", "Differentiated Instruction" });

        var missingSkills = potentialJobSkills
            .Where(s => !matchedSkills.Any(ms => ms.Equals(s, StringComparison.OrdinalIgnoreCase)) &&
                        !candidateSkills.Any(cs => cs.Equals(s, StringComparison.OrdinalIgnoreCase)))
            .Take(3)
            .ToList();

        // Calculate score
        decimal score = 55;
        if (matchedSkills.Count > 0) score += Math.Min(matchedSkills.Count * 7, 25);
        if (!string.IsNullOrEmpty(job.BoardAffiliation) && (candidate.BoardsTaught ?? "").Contains(job.BoardAffiliation, StringComparison.OrdinalIgnoreCase)) score += 10;
        if (candidate.TotalExperienceYears >= 2) score += 10;
        if (score > 96) score = 96;

        var fitLevel = score >= 80 ? "High" : (score >= 55 ? "Moderate" : "Low");
        var companyName = job.Institution?.Name ?? "Hiring Institution";

        var isExpMatch = candidate.TotalExperienceYears >= 1;
        var isEduMatch = !string.IsNullOrWhiteSpace(candidate.Education);
        var isLocMatch = string.IsNullOrWhiteSpace(job.Location) || 
                         string.IsNullOrWhiteSpace(candidate.CurrentLocation) || 
                         job.Location.Contains(candidate.CurrentLocation, StringComparison.OrdinalIgnoreCase) || 
                         candidate.CurrentLocation.Contains(job.Location, StringComparison.OrdinalIgnoreCase);

        return new JobResumeComparisonDto
        {
            JobId = job.Id,
            JobTitle = job.Title,
            CompanyName = companyName,
            MatchScore = Math.Round(score, 0),
            FitLevel = fitLevel,
            MatchSummary = $"Candidate demonstrates a {fitLevel.ToLower()} alignment with the {job.Title} role, exhibiting relevant subject competencies and pedagogical background.",
            MatchedSkills = matchedSkills.Any() ? matchedSkills : new List<string> { candidateSkills.FirstOrDefault() ?? "Teaching" },
            MissingSkills = missingSkills,
            ExperienceMatch = new ExperienceMatchDto
            {
                Required = "2-5 years",
                Candidate = $"{candidate.TotalExperienceYears} years",
                IsMatch = isExpMatch,
                Notes = isExpMatch ? "Experience meets the recommended baseline." : "Candidate may benefit from highlighting project-based or intern experience."
            },
            EducationMatch = new EducationMatchDto
            {
                Required = "Degree in relevant subject / B.Ed",
                Candidate = string.IsNullOrWhiteSpace(candidate.Education) ? "Not Specified" : candidate.Education,
                IsMatch = isEduMatch,
                Notes = isEduMatch ? "Educational credentials align with institutional criteria." : "Please ensure highest degree is clearly stated."
            },
            LocationMatch = new LocationMatchDto
            {
                JobLocation = job.Location,
                CandidateLocation = string.IsNullOrWhiteSpace(candidate.CurrentLocation) ? "Flexible" : candidate.CurrentLocation,
                IsMatch = isLocMatch,
                Notes = isLocMatch ? "Candidate is located within commutable range." : "Candidate may need to relocate or confirm remote/hybrid terms."
            },
            Strengths = new List<string>
            {
                $"Strong foundation in {(string.IsNullOrWhiteSpace(candidate.BoardsTaught) ? "academic curriculum" : candidate.BoardsTaught + " board requirements")}.",
                $"Experienced with senior school learners ({(string.IsNullOrWhiteSpace(candidate.ClassesTaught) ? "Secondary grades" : candidate.ClassesTaught)}).",
                "Proven dedication to student academic progress and active pedagogy."
            },
            ImprovementSuggestions = new List<string>
            {
                $"Highlight familiarity with {(missingSkills.FirstOrDefault() ?? "modern digital learning tools")} in your resume highlights.",
                "Quantify student pass percentages, Olympiad ranks, or grade improvements in work experience bullet points."
            }
        };
    }

    private TailoredResumeDto GenerateFallbackTailoredResume(Candidate candidate, Job job)
    {
        var subject = !string.IsNullOrWhiteSpace(job.SubjectDepartment) ? job.SubjectDepartment : job.Title;
        var board = !string.IsNullOrWhiteSpace(job.BoardAffiliation) ? job.BoardAffiliation : (candidate.BoardsTaught ?? "CBSE");
        var companyName = job.Institution?.Name ?? "your esteemed institution";

        return new TailoredResumeDto
        {
            JobId = job.Id,
            JobTitle = job.Title,
            TailoredHeadline = $"Passionate {subject} Educator | {candidate.TotalExperienceYears}+ Years Experience | {board} Specialist",
            TailoredSummary = $"Dedicated and results-driven {subject} teacher with {candidate.TotalExperienceYears} years of experience inspiring academic excellence across {board} curriculum. Adept at modern pedagogical methods, individualized student mentoring, and integrating technology to achieve high student engagement and outstanding board examination performance.",
            TailoredBulletPoints = new List<string>
            {
                $"Spearheaded {subject} curriculum delivery for secondary students, achieving exceptional student comprehension and a 95%+ board pass rate.",
                $"Implemented diagnostic and formative assessment strategies, offering differentiated instruction to both gifted and remedial learners.",
                $"Leveraged interactive smartboard resources and project-based learning modules to cultivate critical thinking and problem-solving skills."
            },
            RecommendedSkillsToAdd = new List<string> { $"{subject} Pedagogy", $"{board} Curriculum", "Formative Assessment", "Smart Classroom Technology" },
            CoverNotePitch = $"Dear Hiring Committee at {companyName},\n\nI am excited to submit my application for the {job.Title} position. With over {candidate.TotalExperienceYears} years of teaching experience under {board} standards and a strong foundation in {subject}, I have consistently demonstrated the ability to engage learners, cultivate critical thinking, and uphold academic excellence.\n\nMy teaching philosophy aligns closely with your institution's dedication to holistic student growth. I would welcome the opportunity to discuss how my classroom management and pedagogical expertise can contribute to your academic community.\n\nSincerely,\n{candidate.User?.FirstName} {candidate.User?.LastName}"
        };
    }

    public async Task<ParsedJobDescriptionDto> ParseJobDescriptionAsync(byte[] fileData, string fileName)
    {
        var extractedText = ExtractTextFromDocument(fileData, fileName);
        var preview = extractedText.Length > 500 ? extractedText.Substring(0, 500) + "..." : extractedText;

        if (string.IsNullOrWhiteSpace(extractedText) || extractedText.Trim().Length < 20)
        {
            var fallbackEmpty = GetFallbackParsedJobDescription(extractedText, fileName);
            fallbackEmpty.RawTextPreview = preview;
            return fallbackEmpty;
        }

        var prompt = $@"
You are an expert HR recruiter and educational hiring specialist for schools, colleges, and educational institutions.
Analyze the following Job Description (JD) text and extract structured job posting parameters.

=== JOB DESCRIPTION DOCUMENT ({fileName}) ===
{extractedText}

=== EXTRACTION INSTRUCTIONS ===
1. Title: The clean job/position title (e.g., 'Senior Secondary Mathematics Teacher', 'Head of Department - Science', 'School Principal').
2. Description: A comprehensive and well-structured overview of the role, core responsibilities, and teaching expectations.
3. Requirements: Necessary qualifications (e.g., B.Ed, M.Sc, PhD), pedagogical competencies, subject certifications, and experience criteria.
4. Location: Campus/workplace city or state (e.g., 'Bengaluru', 'Delhi NCR', 'Mumbai').
5. MinSalary: Minimum annual or monthly salary as a number, or null if not mentioned.
6. MaxSalary: Maximum annual or monthly salary as a number, or null if not mentioned.
7. JobType: One of 'FullTime', 'PartTime', 'Contract', 'Internship', 'Temporary'. Default to 'FullTime'.
8. WorkMode: One of 'OnSite', 'Remote', 'Hybrid'. Default to 'OnSite'.
9. BoardAffiliation: Education board if mentioned (e.g., 'CBSE', 'ICSE', 'IB', 'Cambridge', 'State Board').
10. SubjectDepartment: The academic discipline or department (e.g., 'Mathematics', 'Physics', 'English', 'Computer Science').
11. Keywords: 5 to 8 comma-separated relevant skills, competencies, or subject tags for search and matching.
12. MinExperienceYears: Minimum years of experience required as an integer (e.g. 3), or null.
13. MaxExperienceYears: Maximum years of experience required as an integer (e.g. 7), or null.
14. SuggestedScreeningQuestions: A list of 2 to 4 high-value screening interview questions specific to this role and curriculum.

Respond ONLY with a valid JSON object matching this schema exactly:
{{
  ""title"": ""string"",
  ""description"": ""string"",
  ""requirements"": ""string"",
  ""location"": ""string"",
  ""minSalary"": null,
  ""maxSalary"": null,
  ""jobType"": ""FullTime"",
  ""workMode"": ""OnSite"",
  ""boardAffiliation"": ""string"",
  ""subjectDepartment"": ""string"",
  ""keywords"": ""string"",
  ""minExperienceYears"": null,
  ""maxExperienceYears"": null,
  ""suggestedScreeningQuestions"": [
    ""string"",
    ""string""
  ]
}}";

        var result = await CallGeminiAndDeserializeAsync<ParsedJobDescriptionDto>(prompt);
        if (result != null && (!string.IsNullOrWhiteSpace(result.Title) || !string.IsNullOrWhiteSpace(result.Description)))
        {
            result.RawTextPreview = preview;
            if (string.IsNullOrWhiteSpace(result.JobType)) result.JobType = "FullTime";
            if (string.IsNullOrWhiteSpace(result.WorkMode)) result.WorkMode = "OnSite";
            return result;
        }

        var fallback = GetFallbackParsedJobDescription(extractedText, fileName);
        fallback.RawTextPreview = preview;
        return fallback;
    }

    private string ExtractTextFromDocument(byte[] fileData, string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        try
        {
            if (ext == ".pdf")
            {
                using var document = PdfDocument.Open(fileData);
                var sb = new StringBuilder();
                foreach (var page in document.GetPages())
                {
                    sb.AppendLine(page.Text);
                }
                return sb.ToString();
            }
            else if (ext == ".docx")
            {
                using var ms = new MemoryStream(fileData);
                using var archive = new ZipArchive(ms, ZipArchiveMode.Read);
                var docEntry = archive.GetEntry("word/document.xml");
                if (docEntry != null)
                {
                    using var stream = docEntry.Open();
                    var xdoc = XDocument.Load(stream);
                    XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                    var paragraphs = xdoc.Descendants(w + "p");
                    var sb = new StringBuilder();
                    foreach (var p in paragraphs)
                    {
                        var text = string.Concat(p.Descendants(w + "t").Select(t => t.Value));
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            sb.AppendLine(text);
                        }
                    }
                    return sb.ToString();
                }
            }
            else if (ext == ".txt")
            {
                return Encoding.UTF8.GetString(fileData);
            }
            else if (ext == ".doc")
            {
                var rawText = Encoding.ASCII.GetString(fileData);
                var matches = Regex.Matches(rawText, @"[\t\r\n\x20-\x7E]{4,}");
                var sb = new StringBuilder();
                foreach (Match m in matches)
                {
                    sb.AppendLine(m.Value);
                }
                return sb.ToString();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract text from document {FileName}", fileName);
        }

        return string.Empty;
    }

    private ParsedJobDescriptionDto GetFallbackParsedJobDescription(string text, string fileName)
    {
        var lines = (text ?? "").Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        // 1. Title detection
        string title = "";
        var titleKeywords = new[] { "teacher", "faculty", "principal", "professor", "lecturer", "educator", "instructor", "coordinator", "headmistress", "headmaster", "counselor", "developer", "engineer", "manager" };
        foreach (var line in lines.Take(15))
        {
            if (line.Length < 80 && titleKeywords.Any(k => line.Contains(k, StringComparison.OrdinalIgnoreCase)))
            {
                title = line;
                break;
            }
        }
        if (string.IsNullOrEmpty(title))
        {
            title = lines.FirstOrDefault(l => l.Length < 60) ?? Path.GetFileNameWithoutExtension(fileName).Replace("_", " ").Replace("-", " ");
        }

        // 2. Board Affiliation
        string board = "";
        var boards = new[] { "CBSE", "ICSE", "IB", "Cambridge", "IGCSE", "State Board" };
        foreach (var b in boards)
        {
            if (Regex.IsMatch(text ?? "", $@"\b{b}\b", RegexOptions.IgnoreCase))
            {
                board = b;
                break;
            }
        }

        // 3. Subject / Department
        string subject = "";
        var subjects = new[] { "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Studies", "Science", "Computer Science", "History", "Geography", "Commerce", "Economics", "Physical Education", "Art" };
        foreach (var s in subjects)
        {
            if (Regex.IsMatch(text ?? "", $@"\b{s}\b", RegexOptions.IgnoreCase))
            {
                subject = s;
                break;
            }
        }

        // 4. Experience Years
        int? minExp = null;
        int? maxExp = null;
        var expRangeMatch = Regex.Match(text ?? "", @"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)", RegexOptions.IgnoreCase);
        if (expRangeMatch.Success)
        {
            if (int.TryParse(expRangeMatch.Groups[1].Value, out var min)) minExp = min;
            if (int.TryParse(expRangeMatch.Groups[2].Value, out var max)) maxExp = max;
        }
        else
        {
            var singleExpMatch = Regex.Match(text ?? "", @"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?experience", RegexOptions.IgnoreCase);
            if (singleExpMatch.Success && int.TryParse(singleExpMatch.Groups[1].Value, out var exp))
            {
                minExp = exp;
            }
        }

        // 5. Work mode
        string workMode = "OnSite";
        if (Regex.IsMatch(text ?? "", @"\b(remote|work from home|wfh)\b", RegexOptions.IgnoreCase)) workMode = "Remote";
        else if (Regex.IsMatch(text ?? "", @"\bhybrid\b", RegexOptions.IgnoreCase)) workMode = "Hybrid";

        // 6. Job Type
        string jobType = "FullTime";
        if (Regex.IsMatch(text ?? "", @"\bpart[- ]time\b", RegexOptions.IgnoreCase)) jobType = "PartTime";
        else if (Regex.IsMatch(text ?? "", @"\bcontract\b", RegexOptions.IgnoreCase)) jobType = "Contract";
        else if (Regex.IsMatch(text ?? "", @"\binternship\b", RegexOptions.IgnoreCase)) jobType = "Internship";

        // 7. Location
        string location = "";
        var cities = new[] { "Delhi", "New Delhi", "Mumbai", "Bengaluru", "Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Noida", "Gurugram", "Gurgaon", "Ahmedabad", "Jaipur", "Chandigarh", "Lucknow" };
        foreach (var city in cities)
        {
            if (Regex.IsMatch(text ?? "", $@"\b{city}\b", RegexOptions.IgnoreCase))
            {
                location = city;
                break;
            }
        }

        // 8. Salary extraction
        decimal? minSalary = null;
        decimal? maxSalary = null;
        var salaryMatch = Regex.Match(text ?? "", @"(?:INR|Rs\.?|₹)\s*([\d,]+)\s*(?:-|to)\s*([\d,]+)", RegexOptions.IgnoreCase);
        if (salaryMatch.Success)
        {
            if (decimal.TryParse(salaryMatch.Groups[1].Value.Replace(",", ""), out var s1)) minSalary = s1;
            if (decimal.TryParse(salaryMatch.Groups[2].Value.Replace(",", ""), out var s2)) maxSalary = s2;
        }
        else
        {
            var lpaMatch = Regex.Match(text ?? "", @"(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|lacs?|lakhs?)", RegexOptions.IgnoreCase);
            if (lpaMatch.Success)
            {
                if (decimal.TryParse(lpaMatch.Groups[1].Value, out var l1)) minSalary = l1 * 100000;
                if (decimal.TryParse(lpaMatch.Groups[2].Value, out var l2)) maxSalary = l2 * 100000;
            }
        }

        // 9. Description & Requirements heuristic splitting
        var descLines = new List<string>();
        var reqLines = new List<string>();
        bool inReq = false;

        foreach (var line in lines)
        {
            if (Regex.IsMatch(line, @"^(requirements|qualifications|eligibility|what you need|who you are|skills required):?", RegexOptions.IgnoreCase))
            {
                inReq = true;
                continue;
            }
            if (inReq)
            {
                reqLines.Add(line);
            }
            else
            {
                descLines.Add(line);
            }
        }

        string description = descLines.Any() ? string.Join("\n", descLines.Take(8)) : (text ?? "");
        string requirements = reqLines.Any() ? string.Join("\n", reqLines.Take(8)) : "Bachelor's / Master's degree in relevant discipline, B.Ed or equivalent teaching certification. Proven classroom experience.";

        // Keywords
        var keywords = new List<string>();
        if (!string.IsNullOrEmpty(subject)) keywords.Add(subject);
        if (!string.IsNullOrEmpty(board)) keywords.Add(board);
        keywords.AddRange(new[] { "Curriculum Planning", "Classroom Management", "Pedagogy", "Student Assessment" });

        // Suggested Questions
        var questions = new List<string>
        {
            $"How do you incorporate active learning and differentiated instruction in your {(!string.IsNullOrEmpty(subject) ? subject : "classroom")} teaching?",
            $"What experience do you have aligning your lesson plans with {(!string.IsNullOrEmpty(board) ? board : "modern curriculum")} examination standards?",
            "Can you describe a classroom situation where you helped a struggling student achieve a significant breakthrough?"
        };

        return new ParsedJobDescriptionDto
        {
            Title = title,
            Description = description,
            Requirements = requirements,
            Location = location,
            MinSalary = minSalary,
            MaxSalary = maxSalary,
            JobType = jobType,
            WorkMode = workMode,
            BoardAffiliation = board,
            SubjectDepartment = subject,
            Keywords = string.Join(", ", keywords.Distinct()),
            MinExperienceYears = minExp,
            MaxExperienceYears = maxExp,
            SuggestedScreeningQuestions = questions,
            RawTextPreview = (text != null && text.Length > 500) ? text.Substring(0, 500) + "..." : (text ?? "")
        };
    }
}
