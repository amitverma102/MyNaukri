using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.Interfaces;
using UglyToad.PdfPig;

namespace MyNaukri.Infrastructure.Services;

public class GeminiResumeParser : IResumeParser
{
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiResumeParser> _logger;
    private readonly HttpClient _httpClient;

    public GeminiResumeParser(IConfiguration config, ILogger<GeminiResumeParser> logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient();
    }

    public async Task<ParsedResumeDto> ParseAsync(byte[] fileData, string fileName)
    {
        var text = DocumentTextExtractor.ExtractText(fileData, fileName, _logger);
        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning("No readable text could be extracted from resume file {FileName}. Using fallback parser.", fileName);
            return DocumentTextExtractor.ExtractFallbackResume(string.Empty, fileName);
        }

        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
        {
            return DocumentTextExtractor.ExtractFallbackResume(text, fileName);
        }

        var prompt = $@"
You are an expert resume parser for the education sector. Extract the following information from the text below:
1. FirstName: The candidate's first name.
2. LastName: The candidate's last name.
3. Email: The candidate's email address.
4. Skills: A comma-separated list of technical and soft skills.
5. PhoneNumber: The candidate's phone number.
6. TotalExperienceYears: An integer representing the total years of professional experience.
7. CurrentLocation: The candidate's current city/location.
8. ClassesTaught: A comma-separated list of school classes or grades taught (e.g. 10th, 12th, Primary).
9. BoardsTaught: A comma-separated list of education boards taught (e.g. CBSE, ICSE, State Board).
10. Education: The candidate's highest educational degree (e.g. B.Ed, M.Sc).
11. Certifications: A comma-separated list of professional certifications.

Respond ONLY with a valid JSON object matching this schema exactly, and nothing else (leave fields empty if not found):
{{
  ""firstName"": ""string"",
  ""lastName"": ""string"",
  ""email"": ""string"",
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

        var method = _config["Gemini:Method"] ?? "generateContent";
        var configuredModel = _config["Gemini:ModelName"];

        var modelsToTry = new List<string>();
        if (!string.IsNullOrWhiteSpace(configuredModel)) modelsToTry.Add(configuredModel);
        modelsToTry.AddRange(new[] { "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.5-flash" });
        modelsToTry = modelsToTry.Distinct().ToList();

        var requestBody = new
        {
            contents = new[]
            {
                new 
                {
                    parts = new[] { new { text = prompt } }
                }
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 8192
            }
        };

        foreach (var modelName in modelsToTry)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:{method}?key={apiKey}";

            try
            {
                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Gemini API call failed for model {Model} with status {StatusCode}: {ResponseBody}", modelName, response.StatusCode, errorBody);
                    continue;
                }

                var responseJson = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                if (responseJson.TryGetProperty("candidates", out var candidates) && candidates.ValueKind == System.Text.Json.JsonValueKind.Array && candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];
                    if (firstCandidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts) && parts.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        string? textResponse = null;
                        foreach (var part in parts.EnumerateArray())
                        {
                            if (part.TryGetProperty("thought", out var isThought) && isThought.ValueKind == System.Text.Json.JsonValueKind.True)
                            {
                                continue;
                            }
                            if (part.TryGetProperty("text", out var textProp) && textProp.ValueKind == System.Text.Json.JsonValueKind.String)
                            {
                                var t = textProp.GetString();
                                if (!string.IsNullOrWhiteSpace(t))
                                {
                                    textResponse = t;
                                    break;
                                }
                            }
                        }

                        if (!string.IsNullOrEmpty(textResponse))
                        {
                            var cleanJson = textResponse.Trim();
                            if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                            {
                                cleanJson = cleanJson.Substring(7);
                            }
                            else if (cleanJson.StartsWith("```", StringComparison.OrdinalIgnoreCase))
                            {
                                cleanJson = cleanJson.Substring(3);
                            }

                            if (cleanJson.EndsWith("```", StringComparison.OrdinalIgnoreCase))
                            {
                                cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
                            }

                            var start = cleanJson.IndexOf('{');
                            var end = cleanJson.LastIndexOf('}');
                            if (start >= 0 && end > start)
                            {
                                cleanJson = cleanJson.Substring(start, end - start + 1);
                            }

                            var result = System.Text.Json.JsonSerializer.Deserialize<ParsedResumeDto>(cleanJson, new System.Text.Json.JsonSerializerOptions 
                            {
                                PropertyNameCaseInsensitive = true 
                            });

                            if (result != null && (!string.IsNullOrWhiteSpace(result.Email) || !string.IsNullOrWhiteSpace(result.Skills) || !string.IsNullOrWhiteSpace(result.PhoneNumber)))
                            {
                                return result;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call Gemini API with model {Model}", modelName);
            }
        }

        _logger.LogInformation("Falling back to deterministic heuristic resume extractor for {FileName}", fileName);
        return DocumentTextExtractor.ExtractFallbackResume(text, fileName);
    }
}

