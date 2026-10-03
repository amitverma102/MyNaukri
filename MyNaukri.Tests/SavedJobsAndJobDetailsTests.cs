using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using Xunit;

namespace MyNaukri.Tests;

public class SavedJobsAndJobDetailsTests
{
    private DbContextOptions<ApplicationDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    [Fact]
    public async Task SavedJobsController_GetSavedJobs_ReturnsJobDetailsAndAccurateIsAppliedFlag()
    {
        var dbName = "TestDb_SavedJobs_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution
        {
            Name = "Delhi Public School",
            LogoUrl = "/uploads/institutions/dps.png",
            City = "New Delhi"
        };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@dps.com", Role = Role.Recruiter, FirstName = "HR", LastName = "DPS" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Designation = "HR Head" };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job1 = new Job
        {
            Title = "Senior PGT Mathematics Teacher",
            Description = "Teaching 11th and 12th CBSE students.",
            Requirements = "M.Sc. Maths + B.Ed.",
            MinSalary = 600000,
            MaxSalary = 900000,
            JobType = JobType.FullTime,
            Location = "New Delhi",
            WorkMode = "In-Person",
            BoardAffiliation = "CBSE",
            SubjectDepartment = "Mathematics",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            IsActive = true
        };

        var job2 = new Job
        {
            Title = "Physics Teacher",
            Description = "Teaching 9th and 10th ICSE students.",
            Requirements = "B.Sc. Physics + B.Ed.",
            MinSalary = 450000,
            MaxSalary = 650000,
            JobType = JobType.FullTime,
            Location = "Noida",
            WorkMode = "In-Person",
            BoardAffiliation = "ICSE",
            SubjectDepartment = "Physics",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            IsActive = true
        };

        context.Jobs.AddRange(job1, job2);

        var candidateUser = new User { Email = "candidate@test.com", Role = Role.Candidate, FirstName = "Raj", LastName = "Kumar" };
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "9999999999" };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        // Candidate saved both job1 and job2
        var saved1 = new SavedJob { CandidateId = candidate.Id, JobId = job1.Id };
        var saved2 = new SavedJob { CandidateId = candidate.Id, JobId = job2.Id };
        context.SavedJobs.AddRange(saved1, saved2);

        // Candidate applied to job1, but NOT to job2
        var app1 = new JobApplication { CandidateId = candidate.Id, JobId = job1.Id, Status = ApplicationStatus.Applied };
        context.JobApplications.Add(app1);

        await context.SaveChangesAsync();

        var controller = new SavedJobsController(context);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, candidateUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "Candidate")
        }, "mock"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claims } };

        // Act
        var result = await controller.GetSavedJobs();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var savedJobsList = Assert.IsAssignableFrom<System.Collections.Generic.IEnumerable<SavedJobDto>>(okResult.Value).ToList();

        Assert.Equal(2, savedJobsList.Count);

        var savedJob1Dto = savedJobsList.First(s => s.JobId == job1.Id);
        Assert.Equal("Senior PGT Mathematics Teacher", savedJob1Dto.JobTitle);
        Assert.Equal("Teaching 11th and 12th CBSE students.", savedJob1Dto.JobDescription);
        Assert.Equal("M.Sc. Maths + B.Ed.", savedJob1Dto.JobRequirements);
        Assert.Equal("Delhi Public School", savedJob1Dto.CompanyName);
        Assert.Equal("CBSE", savedJob1Dto.BoardAffiliation);
        Assert.Equal("Mathematics", savedJob1Dto.SubjectDepartment);
        Assert.True(savedJob1Dto.IsApplied, "Job1 should have IsApplied = true");

        var savedJob2Dto = savedJobsList.First(s => s.JobId == job2.Id);
        Assert.Equal("Physics Teacher", savedJob2Dto.JobTitle);
        Assert.False(savedJob2Dto.IsApplied, "Job2 should have IsApplied = false");
    }

    [Fact]
    public async Task JobsController_GetJobById_ReturnsJobAndSetsIsAppliedForCandidate()
    {
        var dbName = "TestDb_JobsById_" + Guid.NewGuid();
        var options = CreateInMemoryOptions(dbName);
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Pathway World School", City = "Gurugram" };
        context.Institutions.Add(institution);

        var recruiterUser = new User { Email = "recruiter@pathway.com", Role = Role.Recruiter, FirstName = "HR", LastName = "User" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id };
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);

        var job = new Job
        {
            Title = "IB DP English Facilitator",
            Description = "Lead IB DP English Literature classes.",
            Requirements = "MA English + IB training",
            MinSalary = 800000,
            MaxSalary = 1200000,
            JobType = JobType.FullTime,
            Location = "Gurugram",
            RecruiterId = recruiter.Id,
            InstitutionId = institution.Id,
            IsActive = true
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate2@test.com", Role = Role.Candidate, FirstName = "Neha", LastName = "Kapoor" };
        var candidate = new Candidate { UserId = candidateUser.Id };
        context.Users.Add(candidateUser);
        context.Candidates.Add(candidate);

        // Candidate applied to this job
        var app = new JobApplication { CandidateId = candidate.Id, JobId = job.Id };
        context.JobApplications.Add(app);

        await context.SaveChangesAsync();

        var aiMock = new Mock<IAiService>();
        var searchMock = new Mock<ISearchService>();
        var creditMock = new Mock<ICreditService>();

        var controller = new JobsController(context, aiMock.Object, searchMock.Object, creditMock.Object);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, candidateUser.Id.ToString()),
            new Claim(ClaimTypes.Role, "Candidate")
        }, "mock"));
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claims } };

        // Act
        var result = await controller.GetJobById(job.Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var jobDto = Assert.IsType<JobDto>(okResult.Value);

        Assert.Equal(job.Id, jobDto.Id);
        Assert.Equal("IB DP English Facilitator", jobDto.Title);
        Assert.Equal("Pathway World School", jobDto.CompanyName);
        Assert.True(jobDto.IsApplied, "JobDto should have IsApplied = true for this candidate");
    }
}
