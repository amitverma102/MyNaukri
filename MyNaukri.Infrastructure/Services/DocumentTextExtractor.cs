using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using MyNaukri.Application.DTOs.Candidates;
using UglyToad.PdfPig;

namespace MyNaukri.Infrastructure.Services;

public static class DocumentTextExtractor
{
    public static string ExtractText(byte[] fileData, string fileName, ILogger? logger = null)
    {
        if (fileData == null || fileData.Length == 0)
        {
            return string.Empty;
        }

        var ext = Path.GetExtension(fileName ?? "").ToLowerInvariant();
        try
        {
            if (ext == ".pdf")
            {
                var text = ExtractPdfText(fileData);
                if (!string.IsNullOrWhiteSpace(text)) return text;
            }
            else if (ext == ".docx")
            {
                var text = ExtractDocxText(fileData);
                if (!string.IsNullOrWhiteSpace(text)) return text;
            }
            else if (ext == ".txt")
            {
                return Encoding.UTF8.GetString(fileData);
            }
            else if (ext == ".doc")
            {
                var text = ExtractDocText(fileData);
                if (!string.IsNullOrWhiteSpace(text)) return text;
            }

            // Fallback for unknown extensions or if format-specific parser returned empty
            var utf8 = Encoding.UTF8.GetString(fileData);
            if (IsMostlyPrintable(utf8))
            {
                return utf8;
            }

            return ExtractDocText(fileData);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to extract text from document {FileName}", fileName);
            return string.Empty;
        }
    }

    private static string ExtractPdfText(byte[] fileData)
    {
        try
        {
            using var document = PdfDocument.Open(fileData);
            var sb = new StringBuilder();
            foreach (var page in document.GetPages())
            {
                if (!string.IsNullOrWhiteSpace(page.Text))
                {
                    sb.AppendLine(page.Text);
                }
            }
            return sb.ToString();
        }
        catch
        {
            // If PdfPig fails (e.g. malformed or binary-embedded text), try printable text scan
            return ExtractDocText(fileData);
        }
    }

    private static string ExtractDocxText(byte[] fileData)
    {
        try
        {
            using var ms = new MemoryStream(fileData);
            using var archive = new ZipArchive(ms, ZipArchiveMode.Read);
            var sb = new StringBuilder();

            XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

            // Extract from headers first (contact details often live here)
            foreach (var headerEntry in archive.Entries.Where(e => e.FullName.StartsWith("word/header", StringComparison.OrdinalIgnoreCase) && e.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)))
            {
                using var stream = headerEntry.Open();
                var xdoc = XDocument.Load(stream);
                foreach (var p in xdoc.Descendants(w + "p"))
                {
                    var text = string.Concat(p.Descendants(w + "t").Select(t => t.Value));
                    if (!string.IsNullOrWhiteSpace(text)) sb.AppendLine(text);
                }
            }

            // Extract from main document body
            var docEntry = archive.GetEntry("word/document.xml");
            if (docEntry != null)
            {
                using var stream = docEntry.Open();
                var xdoc = XDocument.Load(stream);
                foreach (var p in xdoc.Descendants(w + "p"))
                {
                    var text = string.Concat(p.Descendants(w + "t").Select(t => t.Value));
                    if (!string.IsNullOrWhiteSpace(text)) sb.AppendLine(text);
                }
            }

            return sb.ToString();
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string ExtractDocText(byte[] fileData)
    {
        try
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
        catch
        {
            return string.Empty;
        }
    }

    private static bool IsMostlyPrintable(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        int printable = 0;
        int checkLen = Math.Min(text.Length, 1000);
        for (int i = 0; i < checkLen; i++)
        {
            char c = text[i];
            if (c == '\r' || c == '\n' || c == '\t' || (c >= 32 && c <= 126))
            {
                printable++;
            }
        }
        return (double)printable / checkLen > 0.85;
    }

    public static ParsedResumeDto ExtractFallbackResume(string text, string fileName)
    {
        var cleanText = text ?? string.Empty;
        var lines = cleanText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        // 1. Phone number
        string phone = string.Empty;
        var phoneMatch = Regex.Match(cleanText, @"(?:(?:\+|0{0,2})91[\s-]*)?[6789]\d{9}\b|\b\d{10}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b");
        if (phoneMatch.Success)
        {
            phone = phoneMatch.Value.Trim();
        }

        // 2. Email
        string email = string.Empty;
        var emailMatch = Regex.Match(cleanText, @"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b");
        if (emailMatch.Success)
        {
            email = emailMatch.Value.Trim().ToLowerInvariant();
        }

        // 3. Name
        string firstName = "Candidate";
        string lastName = "";
        foreach (var line in lines.Take(5))
        {
            if (line.Length > 2 && line.Length < 45 && !line.Contains('@') && !Regex.IsMatch(line, @"\d{5,}") && !line.Contains("Resume", StringComparison.OrdinalIgnoreCase) && !line.Contains("Curriculum", StringComparison.OrdinalIgnoreCase))
            {
                var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 1) firstName = parts[0];
                if (parts.Length >= 2) lastName = string.Join(" ", parts.Skip(1));
                break;
            }
        }

        // 4. Experience Years
        int expYears = 0;
        var expMatch = Regex.Match(cleanText, @"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?", RegexOptions.IgnoreCase);
        if (expMatch.Success && int.TryParse(expMatch.Groups[1].Value, out var exp))
        {
            if (exp > 0 && exp <= 50) expYears = exp;
        }

        // 5. Boards
        string boards = string.Empty;
        var knownBoards = new[] { "CBSE", "ICSE", "IB", "Cambridge", "IGCSE", "State Board" };
        var foundBoards = knownBoards.Where(b => Regex.IsMatch(cleanText, $@"\b{b}\b", RegexOptions.IgnoreCase)).ToList();
        if (foundBoards.Count > 0)
        {
            boards = string.Join(", ", foundBoards);
        }

        // 6. Education
        string education = string.Empty;
        var knownDegrees = new[] { "Ph.D", "PhD", "M.Ed", "B.Ed", "M.Sc", "B.Sc", "M.Tech", "B.Tech", "MCA", "BCA", "M.Com", "B.Com", "M.A", "B.A", "D.El.Ed", "NTT", "PGT", "TGT", "PRT" };
        var foundDegrees = knownDegrees.Where(d => Regex.IsMatch(cleanText, $@"\b{Regex.Escape(d)}\b", RegexOptions.IgnoreCase)).ToList();
        if (foundDegrees.Count > 0)
        {
            education = string.Join(", ", foundDegrees.Take(3));
        }

        // 7. Classes taught
        string classes = string.Empty;
        var foundClasses = new List<string>();
        if (Regex.IsMatch(cleanText, @"\b(?:10th|Xth|Class 10|Grade 10)\b", RegexOptions.IgnoreCase)) foundClasses.Add("10th");
        if (Regex.IsMatch(cleanText, @"\b(?:12th|XIIth|Class 12|Grade 12|Senior Secondary)\b", RegexOptions.IgnoreCase)) foundClasses.Add("12th");
        if (Regex.IsMatch(cleanText, @"\b(?:Primary|Middle School|Elementary)\b", RegexOptions.IgnoreCase)) foundClasses.Add("Primary");
        if (foundClasses.Count > 0)
        {
            classes = string.Join(", ", foundClasses);
        }

        // 8. Address & Location (including street-level and sub-localities like Dwarka, Rohini)
        string location = string.Empty;
        string address = string.Empty;

        // Check for prominent sub-localities/areas
        var knownLocalities = new[] 
        { 
            "Dwarka", "Rohini", "Janakpuri", "Saket", "Pitampura", "Vasant Kunj", "Karol Bagh", "Laxmi Nagar", 
            "Mayur Vihar", "Paschim Vihar", "Uttam Nagar", "Indirapuram", "Vaishali", "Rajouri Garden", 
            "Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Electronic City", "Jayanagar",
            "Andheri", "Bandra", "Powai", "Borivali", "Goregaon", "Thane", "Navi Mumbai", "Malad",
            "Gachibowli", "Hitec City", "Madhapur", "Jubilee Hills", "Kukatpally", "Banjara Hills",
            "Velachery", "Adyar", "Anna Nagar", "T. Nagar", "OMR", "Tambaram",
            "Salt Lake", "New Town", "Ballygunge", "Rajarhat",
            "Kothrud", "Hinjawadi", "Wakad", "Baner", "Viman Nagar", "Hadapsar"
        };

        var foundLocality = knownLocalities.FirstOrDefault(l => Regex.IsMatch(cleanText, $@"\b{Regex.Escape(l)}\b", RegexOptions.IgnoreCase));

        // Known major cities
        var knownCities = new[] { "Bengaluru", "Bangalore", "Delhi", "New Delhi", "Noida", "Greater Noida", "Gurugram", "Gurgaon", "Mumbai", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Indore", "Bhopal", "Patna", "Kochi", "Coimbatore", "Ghaziabad", "Faridabad" };
        var foundCity = knownCities.FirstOrDefault(c => Regex.IsMatch(cleanText, $@"\b{Regex.Escape(c)}\b", RegexOptions.IgnoreCase));
        if (!string.IsNullOrEmpty(foundCity))
        {
            location = foundCity.Equals("Bangalore", StringComparison.OrdinalIgnoreCase) ? "Bengaluru" : (foundCity.Equals("Gurgaon", StringComparison.OrdinalIgnoreCase) ? "Gurugram" : foundCity);
        }

        // Try extracting full address line if an explicit Address prefix or sector/street pattern exists
        var addressLineMatch = Regex.Match(cleanText, @"(?:Address|Residing at|Correspondence Address|Residential Address)\s*[:\-]\s*([^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)?)", RegexOptions.IgnoreCase);
        if (addressLineMatch.Success)
        {
            address = addressLineMatch.Groups[1].Value.Trim();
        }
        else
        {
            // Look for street/sector/pocket patterns in lines
            var streetLine = lines.FirstOrDefault(l => 
                Regex.IsMatch(l, @"\b(?:Sector|Sec|Pocket|Pkt|Block|Plot|Flat|H\.No|House No|Street|Road|Lane|Phase)\s*[\w\d\-\/]+", RegexOptions.IgnoreCase) &&
                ((foundLocality != null && l.Contains(foundLocality, StringComparison.OrdinalIgnoreCase)) || (foundCity != null && l.Contains(foundCity, StringComparison.OrdinalIgnoreCase)) || Regex.IsMatch(l, @"\b\d{6}\b")));

            if (!string.IsNullOrWhiteSpace(streetLine))
            {
                address = streetLine.Trim();
            }
            else if (!string.IsNullOrEmpty(foundLocality))
            {
                address = !string.IsNullOrEmpty(location) && !foundLocality.Equals(location, StringComparison.OrdinalIgnoreCase)
                    ? $"{foundLocality}, {location}"
                    : foundLocality;
            }
        }

        if (string.IsNullOrEmpty(location))
        {
            if (!string.IsNullOrEmpty(foundLocality))
            {
                var delhiLocalities = new[] { "Dwarka", "Rohini", "Janakpuri", "Saket", "Pitampura", "Vasant Kunj", "Karol Bagh", "Laxmi Nagar", "Mayur Vihar", "Paschim Vihar", "Uttam Nagar" };
                if (delhiLocalities.Contains(foundLocality, StringComparer.OrdinalIgnoreCase)) location = "New Delhi";
                else location = foundLocality;
            }
            else if (!string.IsNullOrEmpty(address))
            {
                location = address;
            }
        }
        else if (!string.IsNullOrEmpty(foundLocality) && !location.Contains(foundLocality, StringComparison.OrdinalIgnoreCase))
        {
            location = $"{foundLocality}, {location}";
        }

        // 9. Certifications
        string certs = string.Empty;
        var knownCerts = new[] { "CTET", "STET", "TET", "NET", "SET", "GATE", "TESOL", "TEFL", "CELTA" };
        var foundCerts = knownCerts.Where(c => Regex.IsMatch(cleanText, $@"\b{c}\b", RegexOptions.IgnoreCase)).ToList();
        if (foundCerts.Count > 0)
        {
            certs = string.Join(", ", foundCerts);
        }

        // 10. Skills
        var skillsPool = new[]
        {
            "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi", "Science", "Social Studies",
            "Computer Science", "Economics", "Accountancy", "Business Studies", "History", "Geography",
            "Classroom Management", "Curriculum Planning", "Lesson Planning", "Pedagogy", "Smartboard Pedagogy",
            "Formative Assessment", "Differentiated Instruction", "Student Engagement", "STEM Education", "Coding",
            "Python", "C#", ".NET", "Java", "Web Development", "Educational Technology", "Communication", "Leadership"
        };
        var matchedSkills = skillsPool.Where(s => Regex.IsMatch(cleanText, $@"\b{Regex.Escape(s)}\b", RegexOptions.IgnoreCase)).ToList();
        string skillsStr = matchedSkills.Count > 0
            ? string.Join(", ", matchedSkills.Take(8))
            : "Teaching, Curriculum Delivery, Classroom Management";

        return new ParsedResumeDto
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PhoneNumber = phone,
            TotalExperienceYears = expYears,
            CurrentLocation = location,
            Address = address,
            ClassesTaught = classes,
            BoardsTaught = boards,
            Education = education,
            Certifications = certs,
            Skills = skillsStr
        };
    }
}
