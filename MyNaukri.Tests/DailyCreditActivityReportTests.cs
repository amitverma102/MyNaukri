using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class DailyCreditActivityReportTests
{
    private ApplicationDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task ProcessCreditActivityReportsAsync_AllocationToRecruiter_IncludesRecruiterCreditAndExcludesAdminDebitSide()
    {
        // Arrange
        var dbName = Guid.NewGuid().ToString();
        var context = CreateInMemoryDbContext(dbName);
        var mockNotificationService = new Mock<INotificationService>();
        var mockLogger = new Mock<ILogger<DailyCreditActivityReportBackgroundService>>();

        var services = new ServiceCollection();
        services.AddSingleton(context);
        services.AddSingleton(mockNotificationService.Object);
        var serviceProvider = services.BuildServiceProvider();

        var backgroundService = new DailyCreditActivityReportBackgroundService(serviceProvider, mockLogger.Object);

        // Determine yesterday in IST
        TimeZoneInfo istZone;
        try { istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { istZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }

        var istToday = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, istZone).Date;
        var istYesterday = istToday.AddDays(-1);
        var yesterdayMiddayUtc = TimeZoneInfo.ConvertTimeToUtc(istYesterday.AddHours(14), istZone);

        // Create Institution and Wallet
        var institution = new Institution
        {
            Name = "Delhi Public School",
            Status = InstitutionStatus.Active,
            CreditWallet = new InstitutionCreditWallet
            {
                AvailableCredits = 800,
                TotalAllocatedCredits = 200
            }
        };
        context.Institutions.Add(institution);

        // Create Admin User & Profile
        var adminUser = new User
        {
            Email = "admin@dps.edu",
            FirstName = "Principal",
            LastName = "Sharma",
            Role = Role.InstituteAdministrator
        };
        context.Users.Add(adminUser);

        var adminProfile = new InstituteAdminProfile
        {
            InstitutionId = institution.Id,
            Institution = institution,
            UserId = adminUser.Id,
            User = adminUser
        };
        context.InstituteAdminProfiles.Add(adminProfile);

        // Create Recruiter 1
        var recruiterUser = new User
        {
            Email = "recruiter1@dps.edu",
            FirstName = "Aarav",
            LastName = "Patel",
            Role = Role.Recruiter
        };
        context.Users.Add(recruiterUser);

        var recruiter = new Recruiter
        {
            InstitutionId = institution.Id,
            UserId = recruiterUser.Id,
            User = recruiterUser,
            Credits = 180
        };
        context.Recruiters.Add(recruiter);

        // Transaction 1: Admin side trade (central pool deducted -200) -> SHOULD BE EXCLUDED
        var adminSideTransaction = new CreditTransaction
        {
            InstitutionId = institution.Id,
            RecruiterId = null,
            Credits = -200,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Description = "Allocation to Recruiter",
            Reason = "Allocated to Aarav Patel",
            CreatedByUserId = adminUser.Id,
            CreatedAt = yesterdayMiddayUtc
        };
        context.CreditTransactions.Add(adminSideTransaction);

        // Transaction 2: Recruiter 1 side (+200 allocated) -> SHOULD BE INCLUDED
        var recruiterSideAllocation = new CreditTransaction
        {
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id,
            Recruiter = recruiter,
            Credits = 200,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Description = "Allocated from Institution",
            Reason = "Allocated from Institution",
            CreatedByUserId = adminUser.Id,
            CreatedAt = yesterdayMiddayUtc
        };
        context.CreditTransactions.Add(recruiterSideAllocation);

        // Transaction 3: Recruiter 1 posts a job (-20 credits) -> SHOULD BE INCLUDED
        var recruiterJobDeduction = new CreditTransaction
        {
            InstitutionId = institution.Id,
            RecruiterId = recruiter.Id,
            Recruiter = recruiter,
            Credits = -20,
            TransactionType = TransactionType.RecruiterNormalJobPosting,
            Description = "Posted Normal job: Senior Math Teacher",
            Reason = "Posted Normal job",
            CreatedByUserId = recruiterUser.Id,
            CreatedAt = yesterdayMiddayUtc.AddHours(1)
        };
        context.CreditTransactions.Add(recruiterJobDeduction);

        await context.SaveChangesAsync();

        string capturedSubject = "";
        string capturedBody = "";
        string capturedTo = "";

        mockNotificationService
            .Setup(n => n.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<EmailType>()))
            .Callback<string, string, string, EmailType>((to, subject, body, emailType) =>
            {
                capturedTo = to;
                capturedSubject = subject;
                capturedBody = body;
            })
            .Returns(Task.CompletedTask);

        // Act
        await backgroundService.ProcessCreditActivityReportsAsync(CancellationToken.None);

        // Assert
        Assert.Equal("admin@dps.edu", capturedTo);
        Assert.Contains(istYesterday.ToString("dd-MM-yyyy"), capturedSubject);

        // Verify Recruiter transactions are present
        Assert.Contains("+200", capturedBody);
        Assert.Contains("-20", capturedBody);
        Assert.Contains("Aarav Patel", capturedBody);
        Assert.Contains("Posted Normal job", capturedBody);

        // Verify Admin side trade (-200) is strictly NOT present in the table
        Assert.DoesNotContain(">-200<", capturedBody);
        Assert.DoesNotContain("Allocation to Recruiter", capturedBody);

        // Summary assertions
        Assert.Contains("+200", capturedBody); // Allocated
        Assert.Contains("-20", capturedBody);  // Consumed
    }
}
