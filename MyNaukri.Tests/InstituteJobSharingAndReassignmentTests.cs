using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.InstituteAdmin;
using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class InstituteJobSharingAndReassignmentTests
{
    private DbContextOptions<ApplicationDbContext> CreateInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    private (Institution inst, Recruiter recA, User userA, Recruiter recB, User userB, User adminUser, InstituteAdminProfile adminProfile)
        SeedInstitutionAndRecruiters(ApplicationDbContext context)
    {
        var institution = new Institution
        {
            Name = "Greenwood International School",
            Code = "GW01",
            RequireJobApproval = false
        };
        context.Institutions.Add(institution);

        var userA = new User
        {
            Email = "recruiterA@greenwood.edu",
            FirstName = "Alice",
            LastName = "Sharma",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.Add(userA);

        var recA = new Recruiter
        {
            UserId = userA.Id,
            InstitutionId = institution.Id,
            Designation = "Senior Recruiter",
            Credits = 100
        };
        context.Recruiters.Add(recA);

        var userB = new User
        {
            Email = "recruiterB@greenwood.edu",
            FirstName = "Bob",
            LastName = "Verma",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.Add(userB);

        var recB = new Recruiter
        {
            UserId = userB.Id,
            InstitutionId = institution.Id,
            Designation = "Associate Recruiter",
            Credits = 100
        };
        context.Recruiters.Add(recB);

        var adminUser = new User
        {
            Email = "admin@greenwood.edu",
            FirstName = "Principal",
            LastName = "Admin",
            Role = Role.InstituteAdministrator,
            IsActive = true
        };
        context.Users.Add(adminUser);

        var adminProfile = new InstituteAdminProfile
        {
            UserId = adminUser.Id,
            InstitutionId = institution.Id
        };
        context.InstituteAdminProfiles.Add(adminProfile);

        context.SaveChanges();
        return (institution, recA, userA, recB, userB, adminUser, adminProfile);
    }

    private static ControllerContext CreateContextForUser(Guid userId, string role)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        }, "TestAuth"));

        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    [Fact]
    public async Task RecruiterB_CanViewAndManageApplications_ForUnrestrictedJob_PostedByRecruiterA()
    {
        var options = CreateInMemoryOptions(nameof(RecruiterB_CanViewAndManageApplications_ForUnrestrictedJob_PostedByRecruiterA));
        using var context = new ApplicationDbContext(options);
        var (inst, recA, userA, recB, userB, _, _) = SeedInstitutionAndRecruiters(context);

        // Job posted by Recruiter A (unrestricted by default)
        var job = new Job
        {
            Title = "High School Biology Teacher",
            Description = "Teach biology",
            Requirements = "B.Sc/M.Sc, B.Ed",
            JobType = JobType.FullTime,
            Location = "Bangalore",
            InstitutionId = inst.Id,
            RecruiterId = recA.Id,
            IsActive = true,
            IsRestrictedAccess = false,
            ApprovalStatus = JobApprovalStatus.Approved
        };
        context.Jobs.Add(job);

        // Candidate applies
        var candidateUser = new User { Email = "candidate1@test.com", FirstName = "John", LastName = "Doe", Role = Role.Candidate, IsActive = true };
        context.Users.Add(candidateUser);
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "9876543210" };
        context.Candidates.Add(candidate);

        var application = new JobApplication
        {
            JobId = job.Id,
            CandidateId = candidate.Id,
            Status = ApplicationStatus.Applied
        };
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var mockCalendar = new Mock<ICalendarInviteService>();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotification = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var appController = new JobApplicationsController(context, mockCalendar.Object, mockPush.Object, mockNotification.Object, mockAi.Object, mockStorage.Object);
        // Recruiter B acts on the job
        appController.ControllerContext = CreateContextForUser(userB.Id, "Recruiter");

        // 1. Recruiter B views applications for Recruiter A's job
        var getAppsResult = await appController.GetApplicationsForJob(job.Id);
        var okResult = Assert.IsType<OkObjectResult>(getAppsResult.Result);
        var appsList = Assert.IsAssignableFrom<IEnumerable<JobApplicationDto>>(okResult.Value);
        Assert.Single(appsList);

        // 2. Recruiter B updates application status to Shortlisted
        var updateResult = await appController.UpdateApplicationStatus(application.Id, new JobApplicationsController.UpdateStatusRequest
        {
            Status = ApplicationStatus.Shortlisted,
            Note = "Candidate looks great"
        });
        Assert.IsType<NoContentResult>(updateResult);

        var updatedApp = await context.JobApplications.FindAsync(application.Id);
        Assert.NotNull(updatedApp);
        Assert.Equal(ApplicationStatus.Shortlisted, updatedApp.Status);

        // 3. Recruiter B schedules interview
        var scheduleResult = await appController.ScheduleInterview(application.Id, new JobApplicationsController.ScheduleInterviewRequest
        {
            InterviewDate = DateTime.UtcNow.AddDays(2),
            InterviewMode = InterviewMode.Online,
            InterviewLink = "https://meet.google.com/abc-defg-hij"
        });
        Assert.IsType<NoContentResult>(scheduleResult);

        var interviewApp = await context.JobApplications.FindAsync(application.Id);
        Assert.NotNull(interviewApp);
        Assert.Equal(ApplicationStatus.InterviewScheduled, interviewApp.Status);
        Assert.Equal("https://meet.google.com/abc-defg-hij", interviewApp.InterviewLink);
    }

    [Fact]
    public async Task RecruiterB_AccessControl_RestrictedJob_EnforcedUnlessAssigned()
    {
        var options = CreateInMemoryOptions(nameof(RecruiterB_AccessControl_RestrictedJob_EnforcedUnlessAssigned));
        using var context = new ApplicationDbContext(options);
        var (inst, recA, userA, recB, userB, adminUser, _) = SeedInstitutionAndRecruiters(context);

        // Job posted by Recruiter A, restricted to specific recruiters
        var job = new Job
        {
            Title = "Principal",
            Description = "Confidential search",
            Requirements = "10+ years experience",
            JobType = JobType.FullTime,
            Location = "Bangalore",
            InstitutionId = inst.Id,
            RecruiterId = recA.Id,
            IsActive = true,
            IsRestrictedAccess = true,
            ApprovalStatus = JobApprovalStatus.Approved
        };
        context.Jobs.Add(job);

        var candidateUser = new User { Email = "candidate2@test.com", FirstName = "Jane", LastName = "Smith", Role = Role.Candidate, IsActive = true };
        context.Users.Add(candidateUser);
        var candidate = new Candidate { UserId = candidateUser.Id, PhoneNumber = "9876543211" };
        context.Candidates.Add(candidate);

        var application = new JobApplication
        {
            JobId = job.Id,
            CandidateId = candidate.Id,
            Status = ApplicationStatus.Applied
        };
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var mockCalendar = new Mock<ICalendarInviteService>();
        var mockPush = new Mock<IPushNotificationService>();
        var mockNotification = new Mock<INotificationService>();
        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();

        var appController = new JobApplicationsController(context, mockCalendar.Object, mockPush.Object, mockNotification.Object, mockAi.Object, mockStorage.Object);
        appController.ControllerContext = CreateContextForUser(userB.Id, "Recruiter");

        // 1. Recruiter B attempts to view applications -> 403 Forbidden
        var forbiddenResult = await appController.GetApplicationsForJob(job.Id);
        var statusResult = Assert.IsType<ObjectResult>(forbiddenResult.Result);
        Assert.Equal(403, statusResult.StatusCode);

        // 2. Recruiter B attempts to update status -> 403 Forbidden
        var forbiddenStatusUpdate = await appController.UpdateApplicationStatus(application.Id, new JobApplicationsController.UpdateStatusRequest
        {
            Status = ApplicationStatus.Shortlisted
        });
        var updateStatusForbidden = Assert.IsType<ObjectResult>(forbiddenStatusUpdate);
        Assert.Equal(403, updateStatusForbidden.StatusCode);

        // 3. Admin assigns Recruiter B to this job
        var mockInstCredit = new Mock<IInstitutionCreditService>();
        var mockLedger = new Mock<ICreditLedgerService>();
        var mockRazorpay = new Mock<IRazorpayService>();
        var mockStorage2 = new Mock<IStorageService>();
        var adminController = new InstituteAdminController(context, mockInstCredit.Object, mockLedger.Object, mockRazorpay.Object, mockStorage2.Object);
        adminController.ControllerContext = CreateContextForUser(adminUser.Id, "InstituteAdministrator");

        var updateAccessResult = await adminController.UpdateJobAccessConfig(job.Id, new UpdateJobAccessDto
        {
            IsRestrictedAccess = true,
            AssignedRecruiterIds = new List<Guid> { recB.Id }
        });
        Assert.IsType<OkObjectResult>(updateAccessResult);

        // Verify assignment exists in Db
        var assignment = await context.JobRecruiterAssignments.FirstOrDefaultAsync(a => a.JobId == job.Id && a.RecruiterId == recB.Id);
        Assert.NotNull(assignment);

        // 4. Recruiter B can now view applications and act on the job
        var allowedResult = await appController.GetApplicationsForJob(job.Id);
        var okResult = Assert.IsType<OkObjectResult>(allowedResult.Result);
        var appsList = Assert.IsAssignableFrom<IEnumerable<JobApplicationDto>>(okResult.Value);
        Assert.Single(appsList);

        var allowedUpdate = await appController.UpdateApplicationStatus(application.Id, new JobApplicationsController.UpdateStatusRequest
        {
            Status = ApplicationStatus.Shortlisted
        });
        Assert.IsType<NoContentResult>(allowedUpdate);
    }

    [Fact]
    public async Task Admin_CanReassignSingleJob_AndBulkReassign_OnRecruiterDeactivation()
    {
        var options = CreateInMemoryOptions(nameof(Admin_CanReassignSingleJob_AndBulkReassign_OnRecruiterDeactivation));
        using var context = new ApplicationDbContext(options);
        var (inst, recA, userA, recB, userB, adminUser, _) = SeedInstitutionAndRecruiters(context);

        var job1 = new Job { Title = "Math Teacher", Requirements = "Math", Description = "Math", InstitutionId = inst.Id, RecruiterId = recA.Id, IsActive = true };
        var job2 = new Job { Title = "English Teacher", Requirements = "English", Description = "English", InstitutionId = inst.Id, RecruiterId = recA.Id, IsActive = true };
        var job3 = new Job { Title = "History Teacher", Requirements = "History", Description = "History", InstitutionId = inst.Id, RecruiterId = recA.Id, IsActive = true };
        context.Jobs.AddRange(job1, job2, job3);
        await context.SaveChangesAsync();

        var mockInstCredit = new Mock<IInstitutionCreditService>();
        var mockLedger = new Mock<ICreditLedgerService>();
        var mockRazorpay = new Mock<IRazorpayService>();
        var mockStorage = new Mock<IStorageService>();

        var adminController = new InstituteAdminController(context, mockInstCredit.Object, mockLedger.Object, mockRazorpay.Object, mockStorage.Object);
        adminController.ControllerContext = CreateContextForUser(adminUser.Id, "InstituteAdministrator");

        // 1. Reassign job1 individually to Recruiter B
        var reassignResult = await adminController.ReassignJob(job1.Id, new ReassignJobDto { TargetRecruiterId = recB.Id });
        Assert.IsType<OkObjectResult>(reassignResult);

        var updatedJob1 = await context.Jobs.FindAsync(job1.Id);
        Assert.Equal(recB.Id, updatedJob1!.RecruiterId);

        // 2. Deactivate Recruiter A and auto-reassign all remaining jobs to Recruiter B
        var deactivateResult = await adminController.DeactivateRecruiter(recA.Id, reassignToRecruiterId: recB.Id);
        var okDeact = Assert.IsType<OkObjectResult>(deactivateResult);

        var updatedUserA = await context.Users.FindAsync(userA.Id);
        Assert.False(updatedUserA!.IsActive);

        var updatedJob2 = await context.Jobs.FindAsync(job2.Id);
        var updatedJob3 = await context.Jobs.FindAsync(job3.Id);
        Assert.Equal(recB.Id, updatedJob2!.RecruiterId);
        Assert.Equal(recB.Id, updatedJob3!.RecruiterId);
    }

    [Fact]
    public async Task CandidateUnlock_SharedAcrossInstitute_RecruiterB_ChargesZeroCredits()
    {
        var options = CreateInMemoryOptions(nameof(CandidateUnlock_SharedAcrossInstitute_RecruiterB_ChargesZeroCredits));
        using var context = new ApplicationDbContext(options);
        var (inst, recA, userA, recB, userB, _, _) = SeedInstitutionAndRecruiters(context);

        var candidateUser = new User
        {
            Email = "candidate.teacher@example.com",
            FirstName = "Deepak",
            LastName = "Kumar",
            Role = Role.Candidate,
            IsActive = true
        };
        context.Users.Add(candidateUser);
        var candidate = new Candidate
        {
            UserId = candidateUser.Id,
            PhoneNumber = "+919876543210",
            ResumeUrl = "https://storage.example.com/resumes/deepak.pdf"
        };
        context.Candidates.Add(candidate);
        await context.SaveChangesAsync();

        var mockAi = new Mock<IAiService>();
        var mockStorage = new Mock<IStorageService>();
        var mockCredit = new Mock<ICreditService>();
        var mockSearch = new Mock<ISearchService>();
        var mockVideo = new Mock<IVideoVerificationQueue>();

        // Set up Recruiter A credit rates & deductions
        mockCredit.Setup(c => c.GetRatesAsync(recA.Id))
            .ReturnsAsync(new RecruiterCreditRate { ContactViewRate = 2, ResumeDownloadRate = 5 });
        mockCredit.Setup(c => c.GetBalanceAsync(recA.Id))
            .ReturnsAsync(100);
        mockCredit.Setup(c => c.DeductCreditsAsync(recA.Id, 2, TransactionType.RecruiterContactView, It.IsAny<string>(), It.IsAny<string>(), userA.Id))
            .ReturnsAsync(true);
        mockCredit.Setup(c => c.DeductCreditsAsync(recA.Id, 5, TransactionType.RecruiterResumeDownload, It.IsAny<string>(), It.IsAny<string>(), userA.Id))
            .ReturnsAsync(true);

        // Recruiter A controller
        var controllerA = new CandidatesController(context, mockAi.Object, mockStorage.Object, mockCredit.Object, mockSearch.Object, mockVideo.Object);
        controllerA.ControllerContext = CreateContextForUser(userA.Id, "Recruiter");

        // 1. Recruiter A unlocks contact for Candidate
        var unlockA = await controllerA.UnlockContact(candidate.Id);
        var unlockAOk = Assert.IsType<OkObjectResult>(unlockA);

        // Verify CandidateContactAccess created with InstitutionId
        var accessRecord = await context.CandidateContactAccesses.FirstOrDefaultAsync(a => a.CandidateId == candidate.Id);
        Assert.NotNull(accessRecord);
        Assert.Equal(inst.Id, accessRecord.InstitutionId);
        Assert.True(accessRecord.HasUnlockedContact);

        // 2. Recruiter A downloads resume
        var resumeA = await controllerA.DownloadResume(candidate.Id);
        Assert.IsType<OkObjectResult>(resumeA);

        var updatedAccess = await context.CandidateContactAccesses.FirstOrDefaultAsync(a => a.CandidateId == candidate.Id);
        Assert.True(updatedAccess!.HasDownloadedResume);

        // Now Recruiter B from the same institute accesses contact and resume
        var controllerB = new CandidatesController(context, mockAi.Object, mockStorage.Object, mockCredit.Object, mockSearch.Object, mockVideo.Object);
        controllerB.ControllerContext = CreateContextForUser(userB.Id, "Recruiter");

        // 3. Recruiter B unlocks contact -> should NOT call DeductCreditsAsync for Recruiter B
        var unlockB = await controllerB.UnlockContact(candidate.Id);
        var unlockBOk = Assert.IsType<OkObjectResult>(unlockB);

        // Verify credit service was NEVER asked to deduct credits for Recruiter B
        mockCredit.Verify(c => c.DeductCreditsAsync(recB.Id, It.IsAny<int>(), It.IsAny<TransactionType>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);

        // 4. Recruiter B downloads resume -> should NOT call DeductCreditsAsync for Recruiter B
        var resumeB = await controllerB.DownloadResume(candidate.Id);
        var resumeBOk = Assert.IsType<OkObjectResult>(resumeB);

        mockCredit.Verify(c => c.DeductCreditsAsync(recB.Id, It.IsAny<int>(), It.IsAny<TransactionType>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);
    }
}
