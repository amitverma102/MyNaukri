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
        string text = "";
        try
        {
            if (fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                using var document = PdfDocument.Open(fileData);
                foreach (var page in document.GetPages())
                {
                    text += page.Text + " ";
                }
            }
            else
            {
                // For DOC/DOCX, in a real scenario we'd use a library like DocumentFormat.OpenXml.
                // For this implementation, we will fall back to minimal mock or just pass bytes.
                text = "Extracted text for DOC/DOCX is currently mocked. Filename: " + fileName;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse document text for {FileName}", fileName);
            throw new Exception("Failed to extract text from document", ex);
        }

        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
        {
            return new ParsedResumeDto 
            {
                FirstName = "Mock",
                LastName = "User",
                Email = "mock@example.com",
                Skills = "C#, .NET (Mock - No API Key)",
                PhoneNumber = "+91 0000000000",
                TotalExperienceYears = 0
            };
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

        var modelName = _config["Gemini:ModelName"] ?? "gemini-3.5-flash";
        var method = _config["Gemini:Method"] ?? "generateContent";

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
                response_mime_type = "application/json"
            }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:{method}?key={apiKey}";

        try
        {
            var response = await _httpClient.PostAsJsonAsync(url, requestBody);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            
            var candidates = responseJson.GetProperty("candidates");
            if (candidates.GetArrayLength() > 0)
            {
                var firstCandidate = candidates[0];
                var parts = firstCandidate.GetProperty("content").GetProperty("parts");
                if (parts.GetArrayLength() > 0)
                {
                    var textResponse = parts[0].GetProperty("text").GetString();
                    if (!string.IsNullOrEmpty(textResponse))
                    {
                        var cleanJson = textResponse.Trim();
                        if (cleanJson.StartsWith("```json"))
                        {
                            cleanJson = cleanJson.Substring(7);
                            if (cleanJson.EndsWith("```"))
                            {
                                cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
                            }
                        }

                        var result = System.Text.Json.JsonSerializer.Deserialize<ParsedResumeDto>(cleanJson, new System.Text.Json.JsonSerializerOptions 
                        {
                            PropertyNameCaseInsensitive = true 
                        });

                        if (result != null) return result;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Gemini API");
        }

        throw new Exception("Failed to parse resume via Gemini API");
    }
}
