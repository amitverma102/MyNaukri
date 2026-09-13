using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class CreditLedgerAndDeductionTests
{
    private ApplicationDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(options);
    }

    private CreditLedgerService CreateLedgerService(ApplicationDbContext context)
    {
        var configurationMock = new Mock<IConfiguration>();
        var notificationServiceMock = new Mock<INotificationService>();
        var loggerMock = new Mock<ILogger<CreditLedgerService>>();

        return new CreditLedgerService(context, configurationMock.Object, notificationServiceMock.Object, loggerMock.Object);
    }

    [Fact]
    public async Task ConsumeRecruiterCreditsAsync_TwoConsecutiveDeductions_UpdatesRecruiterCreditsAndBatches()
    {
        // Arrange: Recruiter with 200 initial credits allocated via batch
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryDbContext(dbName);
        var ledgerService = CreateLedgerService(context);
        var creditService = new CreditService(context, ledgerService);

        var institutionId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var recruiter = new Recruiter
        {
            InstitutionId = institutionId,
            UserId = userId,
            Credits = 200
        };
        context.Recruiters.Add(recruiter);
        var recruiterId = recruiter.Id;

        var batch = new CreditBatch
        {
            InstitutionId = institutionId,
            RecruiterId = recruiterId,
            CreditType = CreditType.TopUp,
            OriginalQuantity = 200,
            RemainingQuantity = 200,
            ExpiryDate = DateTime.UtcNow.AddMonths(6),
            Status = CreditBatchStatus.Active
        };
        context.CreditBatches.Add(batch);
        await context.SaveChangesAsync();

        // Act 1: Post 1st Normal Job (-20 credits)
        var deduction1 = await creditService.DeductCreditsAsync(
            recruiterId, 
            20, 
            TransactionType.RecruiterNormalJobPosting, 
            null, 
            "Posted Normal job", 
            userId);

        Assert.True(deduction1);

        // Verify balance after 1st job
        var balanceAfter1 = await creditService.GetBalanceAsync(recruiterId);
        var recruiterInDb1 = await context.Recruiters.FindAsync(recruiterId);
        Assert.Equal(180, balanceAfter1);
        Assert.Equal(180, recruiterInDb1!.Credits);
        Assert.Equal(180, batch.RemainingQuantity);

        // Act 2: Post 2nd Normal Job (-20 credits)
        var deduction2 = await creditService.DeductCreditsAsync(
            recruiterId, 
            20, 
            TransactionType.RecruiterNormalJobPosting, 
            null, 
            "Posted Normal job", 
            userId);

        Assert.True(deduction2);

        // Verify balance after 2nd job
        var balanceAfter2 = await creditService.GetBalanceAsync(recruiterId);
        var recruiterInDb2 = await context.Recruiters.FindAsync(recruiterId);
        Assert.Equal(160, balanceAfter2);
        Assert.Equal(160, recruiterInDb2!.Credits);
        Assert.Equal(160, batch.RemainingQuantity);
    }

    [Fact]
    public async Task GetBalanceAsync_WhenRecruiterCreditsAreStale_AutoHealsFromBatches()
    {
        // Arrange: Stale state where recruiter table has 200 credits, but batch has 160 credits
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryDbContext(dbName);
        var ledgerService = CreateLedgerService(context);
        var creditService = new CreditService(context, ledgerService);

        var institutionId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var recruiter = new Recruiter
        {
            InstitutionId = institutionId,
            UserId = userId,
            Credits = 200 // Stale value in table
        };
        context.Recruiters.Add(recruiter);
        var recruiterId = recruiter.Id;

        var batch = new CreditBatch
        {
            InstitutionId = institutionId,
            RecruiterId = recruiterId,
            CreditType = CreditType.TopUp,
            OriginalQuantity = 200,
            RemainingQuantity = 160, // True available quantity
            ExpiryDate = DateTime.UtcNow.AddMonths(6),
            Status = CreditBatchStatus.Active
        };
        context.CreditBatches.Add(batch);
        await context.SaveChangesAsync();

        // Act: Request balance
        var balance = await creditService.GetBalanceAsync(recruiterId);

        // Assert: Balance is self-healed to 160 and DB column is updated
        Assert.Equal(160, balance);
        var recruiterInDb = await context.Recruiters.FindAsync(recruiterId);
        Assert.Equal(160, recruiterInDb!.Credits);
    }
}
