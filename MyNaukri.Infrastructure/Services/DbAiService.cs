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
using UglyToad.PdfPig;

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
                    CompanyName = job.Institution?.Name ?? string.Empty
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
}
