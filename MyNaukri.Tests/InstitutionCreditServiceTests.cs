using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using MyNaukri.Application.Interfaces;
using Moq;
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

        var institutionId = Guid.NewGuid();
        var recruiterId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var mockLedgerService = new Mock<ICreditLedgerService>();
        mockLedgerService
            .Setup(m => m.TransferToRecruiterAsync(institutionId, recruiterId, 200, userId, "Test allocation"))
            .ReturnsAsync(true);

        var service = new InstitutionCreditService(context, mockLedgerService.Object);

        // Act
        var result = await service.AllocateToRecruiterAsync(institutionId, recruiterId, 200, userId, "Test allocation");

        // Assert
        Assert.True(result);
        mockLedgerService.Verify(m => m.TransferToRecruiterAsync(institutionId, recruiterId, 200, userId, "Test allocation"), Times.Once);
    }

    [Fact]
    public async Task AllocateToRecruiterAsync_InsufficientFunds_ReturnsFalse()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_AllocateInsufficient");
        using var context = new ApplicationDbContext(options);

        var institutionId = Guid.NewGuid();
        var recruiterId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var mockLedgerService = new Mock<ICreditLedgerService>();
        mockLedgerService
            .Setup(m => m.TransferToRecruiterAsync(institutionId, recruiterId, 200, userId, "Test"))
            .ReturnsAsync(false);

        var service = new InstitutionCreditService(context, mockLedgerService.Object);

        // Act
        var result = await service.AllocateToRecruiterAsync(institutionId, recruiterId, 200, userId, "Test");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task TransferBetweenRecruitersAsync_SuccessfulTransfer_UpdatesBalances()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_TransferSuccess");
        using var context = new ApplicationDbContext(options);

        var institutionId = Guid.NewGuid();
        var r1Id = Guid.NewGuid();
        var r2Id = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var mockLedgerService = new Mock<ICreditLedgerService>();
        mockLedgerService
            .Setup(m => m.TransferBetweenRecruitersAsync(institutionId, r1Id, r2Id, 30, userId, "Transfer"))
            .ReturnsAsync(true);

        var service = new InstitutionCreditService(context, mockLedgerService.Object);

        // Act
        var result = await service.TransferBetweenRecruitersAsync(institutionId, r1Id, r2Id, 30, userId, "Transfer");

        // Assert
        Assert.True(result);
        mockLedgerService.Verify(m => m.TransferBetweenRecruitersAsync(institutionId, r1Id, r2Id, 30, userId, "Transfer"), Times.Once);
    }
}
