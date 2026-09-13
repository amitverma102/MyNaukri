using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class JobDescriptionParserTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task MockAiService_ParseJobDescriptionAsync_ReturnsStructuredData()
    {
        var mockService = new MockAiService();
        var dummyBytes = Encoding.UTF8.GetBytes("Senior Secondary Physics Teacher CBSE 5 years experience");

        var result = await mockService.ParseJobDescriptionAsync(dummyBytes, "Physics_Teacher_JD.docx");

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.Title));
        Assert.False(string.IsNullOrWhiteSpace(result.Description));
        Assert.NotEmpty(result.SuggestedScreeningQuestions);
        Assert.Equal("FullTime", result.JobType);
    }

    [Fact]
    public async Task DbAiService_ParseJobDescriptionAsync_FallbackParsesTxtContent()
    {
        using var context = CreateInMemoryDbContext();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null); // Force fallback heuristic

        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        var jdText = @"Senior Secondary Physics Teacher
We are seeking an enthusiastic Senior Secondary Physics Teacher to teach 11th and 12th grades.
Location: Bengaluru
Board: CBSE
Experience: 3 to 5 years of teaching experience required.
Salary: 6 to 9 LPA
Job Type: Full-time
Work Mode: On-site

Requirements:
M.Sc in Physics with B.Ed degree.
Demonstrated competence in laboratory practicals and board examination prep.
Strong classroom management and curriculum planning skills.";

        var fileBytes = Encoding.UTF8.GetBytes(jdText);
        var result = await aiService.ParseJobDescriptionAsync(fileBytes, "Physics_JD.txt");

        Assert.NotNull(result);
        Assert.Contains("Physics", result.Title, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("CBSE", result.BoardAffiliation);
        Assert.Equal("Physics", result.SubjectDepartment);
        Assert.Equal(3, result.MinExperienceYears);
        Assert.Equal(5, result.MaxExperienceYears);
        Assert.Equal("Bengaluru", result.Location);
        Assert.Equal(600000m, result.MinSalary);
        Assert.Equal(900000m, result.MaxSalary);
        Assert.Equal("FullTime", result.JobType);
        Assert.Equal("OnSite", result.WorkMode);
        Assert.NotEmpty(result.SuggestedScreeningQuestions);
    }

    [Fact]
    public async Task DbAiService_ParseJobDescriptionAsync_ParsesDocxContent()
    {
        using var context = CreateInMemoryDbContext();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);

        var mockLogger = new Mock<ILogger<DbAiService>>();
        var aiService = new DbAiService(context, mockConfig.Object, mockLogger.Object);

        // Build an in-memory .docx archive
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            var entry = archive.CreateEntry("word/document.xml");
            using var entryStream = entry.Open();
            using var writer = new StreamWriter(entryStream, Encoding.UTF8);
            var xmlContent = @"<?xml version=""1.0"" encoding=""UTF-8"" standalone=""yes""?>
<w:document xmlns:w=""http://schemas.openxmlformats.org/wordprocessingml/2006/main"">
  <w:body>
    <w:p><w:r><w:t>Headmistress - Primary School</w:t></w:r></w:p>
    <w:p><w:r><w:t>Delhi Public Academy is looking for an experienced Headmistress in Delhi.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Board: ICSE</w:t></w:r></w:p>
    <w:p><w:r><w:t>Requirements:</w:t></w:r></w:p>
    <w:p><w:r><w:t>Postgraduate with 5+ years of experience in academic administration.</w:t></w:r></w:p>
  </w:body>
</w:document>";
            writer.Write(xmlContent);
        }

        var docxBytes = ms.ToArray();
        var result = await aiService.ParseJobDescriptionAsync(docxBytes, "Headmistress_JD.docx");

        Assert.NotNull(result);
        Assert.Contains("Headmistress", result.Title, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("ICSE", result.BoardAffiliation);
        Assert.Equal("Delhi", result.Location);
        Assert.Equal(5, result.MinExperienceYears);
        Assert.NotEmpty(result.SuggestedScreeningQuestions);
    }

    [Fact]
    public async Task JobsController_ParseJobDescription_Validations()
    {
        using var context = CreateInMemoryDbContext();
        var mockAi = new Mock<IAiService>();
        var mockSearch = new Mock<ISearchService>();
        var mockCredit = new Mock<ICreditService>();

        mockAi.Setup(a => a.ParseJobDescriptionAsync(It.IsAny<byte[]>(), It.IsAny<string>()))
            .ReturnsAsync(new ParsedJobDescriptionDto
            {
                Title = "Mathematics Teacher",
                Description = "Teaching Math to Class 10 students",
                Location = "Noida",
                BoardAffiliation = "CBSE"
            });

        var controller = new JobsController(context, mockAi.Object, mockSearch.Object, mockCredit.Object);

        // 1. Null file
        var nullResult = await controller.ParseJobDescription(null!);
        Assert.IsType<BadRequestObjectResult>(nullResult.Result);

        // 2. Empty file
        var emptyFileMock = new Mock<IFormFile>();
        emptyFileMock.Setup(f => f.Length).Returns(0);
        var emptyResult = await controller.ParseJobDescription(emptyFileMock.Object);
        Assert.IsType<BadRequestObjectResult>(emptyResult.Result);

        // 3. Unsupported extension
        var invalidExtMock = new Mock<IFormFile>();
        invalidExtMock.Setup(f => f.Length).Returns(1024);
        invalidExtMock.Setup(f => f.FileName).Returns("malware.exe");
        var invalidResult = await controller.ParseJobDescription(invalidExtMock.Object);
        Assert.IsType<BadRequestObjectResult>(invalidResult.Result);

        // 4. Valid file
        var validFileMock = new Mock<IFormFile>();
        var content = Encoding.UTF8.GetBytes("Mathematics Teacher Job Description");
        validFileMock.Setup(f => f.Length).Returns(content.Length);
        validFileMock.Setup(f => f.FileName).Returns("MathTeacher.pdf");
        validFileMock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), default))
            .Returns<Stream, System.Threading.CancellationToken>((stream, token) =>
            {
                stream.Write(content, 0, content.Length);
                return Task.CompletedTask;
            });

        var validResult = await controller.ParseJobDescription(validFileMock.Object);
        var okResult = Assert.IsType<OkObjectResult>(validResult.Result);
        var parsedDto = Assert.IsType<ParsedJobDescriptionDto>(okResult.Value);
        Assert.Equal("Mathematics Teacher", parsedDto.Title);
        Assert.Equal("CBSE", parsedDto.BoardAffiliation);
    }
}
