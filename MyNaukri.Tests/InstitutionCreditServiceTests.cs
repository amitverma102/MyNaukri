using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using Xunit;

namespace MyNaukri.Tests;

public class InstitutionCreditServiceTests
{
    private DbContextOptions<ApplicationDbContext> GetDbContextOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    [Fact]
    public async Task AllocateToRecruiterAsync_SuccessfulAllocation_UpdatesBalancesAndCreatesTransactions()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_AllocateSuccess");
        using var context = new ApplicationDbContext(options);

        var institution = new Institution { Name = "Test Inst" };
        var wallet = new InstitutionCreditWallet { InstitutionId = institution.Id, AvailableCredits = 1000, TotalPurchasedCredits = 1000 };
        var recruiterUser = new User { Email = "recruiter@test.com", FirstName = "R", LastName = "R", PasswordHash = "hash" };
        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institution.Id, Credits = 10 };
        
        context.Institutions.Add(institution);
        context.InstitutionCreditWallets.Add(wallet);
        context.Users.Add(recruiterUser);
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var service = new InstitutionCreditService(context);

        // Act
        var result = await service.AllocateToRecruiterAsync(institution.Id, recruiter.Id, 200, Guid.NewGuid(), "Test allocation");

        // Assert
        Assert.True(result);
        
        var updatedWallet = await context.InstitutionCreditWallets.FindAsync(wallet.Id);
        Assert.Equal(800, updatedWallet.AvailableCredits);
        Assert.Equal(200, updatedWallet.TotalAllocatedCredits);

        var updatedRecruiter = await context.Recruiters.FindAsync(recruiter.Id);
        Assert.Equal(210, updatedRecruiter.Credits);

        var transactions = await context.CreditTransactions.ToListAsync();
        Assert.Equal(2, transactions.Count); // One debit, one credit
    }

    [Fact]
    public async Task AllocateToRecruiterAsync_InsufficientFunds_ReturnsFalse()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_AllocateInsufficient");
        using var context = new ApplicationDbContext(options);

        var institutionId = Guid.NewGuid();
        var wallet = new InstitutionCreditWallet { InstitutionId = institutionId, AvailableCredits = 50 };
        var recruiter = new Recruiter { InstitutionId = institutionId, Credits = 10 };
        
        context.InstitutionCreditWallets.Add(wallet);
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        var service = new InstitutionCreditService(context);

        // Act
        var result = await service.AllocateToRecruiterAsync(institutionId, recruiter.Id, 200, Guid.NewGuid(), "Test");

        // Assert
        Assert.False(result);
        var updatedWallet = await context.InstitutionCreditWallets.FirstOrDefaultAsync();
        Assert.Equal(50, updatedWallet.AvailableCredits); // Unchanged
    }

    [Fact]
    public async Task TransferBetweenRecruitersAsync_SuccessfulTransfer_UpdatesBalances()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_TransferSuccess");
        using var context = new ApplicationDbContext(options);

        var institutionId = Guid.NewGuid();
        var r1 = new Recruiter { InstitutionId = institutionId, Credits = 100 };
        var r2 = new Recruiter { InstitutionId = institutionId, Credits = 50 };
        
        context.Recruiters.Add(r1);
        context.Recruiters.Add(r2);
        await context.SaveChangesAsync();

        var service = new InstitutionCreditService(context);

        // Act
        var result = await service.TransferBetweenRecruitersAsync(institutionId, r1.Id, r2.Id, 30, Guid.NewGuid(), "Transfer");

        // Assert
        Assert.True(result);
        
        var updatedR1 = await context.Recruiters.FindAsync(r1.Id);
        var updatedR2 = await context.Recruiters.FindAsync(r2.Id);
        
        Assert.Equal(70, updatedR1.Credits);
        Assert.Equal(80, updatedR2.Credits);

        var txs = await context.CreditTransactions.ToListAsync();
        Assert.Equal(2, txs.Count);
    }
}
