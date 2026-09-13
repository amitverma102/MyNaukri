using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.Interfaces;
using MyNaukri.Infrastructure.Services;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Application.DTOs.SuperAdmin;
using Xunit;

namespace MyNaukri.Tests;

public class InstituteAdminControllerTests
{
    private DbContextOptions<ApplicationDbContext> GetDbContextOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    private InstituteAdminController CreateController(ApplicationDbContext context, Guid userId)
    {
        var mockCreditService = new Mock<IInstitutionCreditService>();
        var mockLedgerService = new Mock<ICreditLedgerService>();
        var mockRazorpayService = new Mock<IRazorpayService>();
        var mockStorageService = new Mock<IStorageService>();
        var controller = new InstituteAdminController(context, mockCreditService.Object, mockLedgerService.Object, mockRazorpayService.Object, mockStorageService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    [Fact]
    public async Task CreateRecruiter_WhenLimitNotReached_ReturnsOk()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var institution = new Institution { MaxRecruiters = 2 };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var institutionId = institution.Id;
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId });
        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);
        var mockHasher = new Mock<IPasswordHasher>();
        mockHasher.Setup(x => x.Hash(It.IsAny<string>())).Returns("hashed");

        var dto = new CreateRecruiterDto
        {
            FirstName = "Test", LastName = "User", Email = "test1@test.com", Password = "Password1!"
        };

        // Act
        var result = await controller.CreateRecruiter(dto, mockHasher.Object);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var recruitersCount = await context.Recruiters.CountAsync(r => r.InstitutionId == institutionId);
        Assert.Equal(1, recruitersCount);
    }

    [Fact]
    public async Task CreateRecruiter_WhenLimitReached_ReturnsConflict()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var institution = new Institution { MaxRecruiters = 1 };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();
        
        var institutionId = institution.Id;
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId });

        // Add 1 existing recruiter (limit is 1)
        var existingUser = new User { Email = "exist@test.com", FirstName = "E", LastName = "E", PasswordHash = "h", IsActive = true };
        context.Users.Add(existingUser);
        await context.SaveChangesAsync();
        
        context.Recruiters.Add(new Recruiter { UserId = existingUser.Id, InstitutionId = institutionId, Credits = 0 });

        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);
        var mockHasher = new Mock<IPasswordHasher>();
        
        var dto = new CreateRecruiterDto
        {
            FirstName = "Test2", LastName = "User", Email = "test2@test.com", Password = "Password1!"
        };

        // Act
        var result = await controller.CreateRecruiter(dto, mockHasher.Object);

        // Assert
        var conflictResult = Assert.IsType<ConflictObjectResult>(result);
        Assert.NotNull(conflictResult.Value);
        
        var valueType = conflictResult.Value.GetType();
        var codeProp = valueType.GetProperty("code");
        Assert.NotNull(codeProp);
        Assert.Equal("MAX_RECRUITER_LIMIT_REACHED", codeProp.GetValue(conflictResult.Value)?.ToString());

        var recruitersCount = await context.Recruiters.CountAsync(r => r.InstitutionId == institutionId);
        Assert.Equal(1, recruitersCount); // Still 1
    }

    [Fact]
    public async Task ReactivateRecruiter_WhenLimitReached_ReturnsConflict()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var institution = new Institution { MaxRecruiters = 1 };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();
        
        var institutionId = institution.Id;
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId });

        // Add 1 existing active recruiter
        var existingUser = new User { Email = "exist@test.com", FirstName = "E", LastName = "E", PasswordHash = "h", IsActive = true };
        context.Users.Add(existingUser);
        await context.SaveChangesAsync();
        context.Recruiters.Add(new Recruiter { UserId = existingUser.Id, InstitutionId = institutionId, Credits = 0 });

        // Add 1 inactive recruiter that we will try to reactivate
        var inactiveUser = new User { Email = "inactive@test.com", FirstName = "I", LastName = "I", PasswordHash = "h", IsActive = false };
        context.Users.Add(inactiveUser);
        await context.SaveChangesAsync();
        var inactiveRecruiter = new Recruiter { UserId = inactiveUser.Id, InstitutionId = institutionId, Credits = 0 };
        context.Recruiters.Add(inactiveRecruiter);

        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);

        // Act
        var result = await controller.ReactivateRecruiter(inactiveRecruiter.Id);

        // Assert
        var conflictResult = Assert.IsType<ConflictObjectResult>(result);
        var valueType = conflictResult.Value.GetType();
        var codeProp = valueType.GetProperty("code");
        Assert.Equal("MAX_RECRUITER_LIMIT_REACHED", codeProp.GetValue(conflictResult.Value)?.ToString());

        // Ensure user is still inactive
        var dbUser = await context.Users.FindAsync(inactiveUser.Id);
        Assert.False(dbUser.IsActive);
    }
    
    [Fact]
    public async Task GetRecruiters_TenantIsolation_OnlyReturnsOwnRecruiters()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var inst1 = new Institution();
        var inst2 = new Institution();
        context.Institutions.Add(inst1);
        context.Institutions.Add(inst2);
        await context.SaveChangesAsync();
        
        var institutionId1 = inst1.Id;
        var institutionId2 = inst2.Id;
        
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId1 });

        // Add recruiter to institution 1
        var user1 = new User { Email = "r1@test.com", FirstName = "1", LastName = "1", PasswordHash = "h", IsActive = true };
        context.Users.Add(user1);
        await context.SaveChangesAsync();
        context.Recruiters.Add(new Recruiter { UserId = user1.Id, InstitutionId = institutionId1, Credits = 0 });

        // Add recruiter to institution 2
        var user2 = new User { Email = "r2@test.com", FirstName = "2", LastName = "2", PasswordHash = "h", IsActive = true };
        context.Users.Add(user2);
        await context.SaveChangesAsync();
        context.Recruiters.Add(new Recruiter { UserId = user2.Id, InstitutionId = institutionId2, Credits = 0 });

        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);

        // Act
        var result = await controller.GetRecruiters(null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        // It returns an IEnumerable of anonymous types, so we can check count via reflection or casting to IEnumerable<object>
        var enumerable = okResult.Value as System.Collections.IEnumerable;
        Assert.NotNull(enumerable);
        
        int count = 0;
        foreach (var item in enumerable)
        {
            count++;
        }
        
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task GetCreditTransactions_ExcludesRecruiterSideTransactions_OnlyReturnsWalletTransactions()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var institution = new Institution { Name = "Test Inst", Code = "TI01" };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var institutionId = institution.Id;
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId });

        var recruiterUser = new User { FirstName = "Recruiter", LastName = "User", Email = "rec@test.com", PasswordHash = "h" };
        context.Users.Add(recruiterUser);

        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institutionId, Credits = 200 };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        // 1. Wallet transaction (-200): Admin allocates 200 credits to recruiter
        var walletTx = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = null,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Credits = -200,
            BalanceBefore = 1000,
            BalanceAfter = 800,
            CreatedByUserId = adminUserId,
            Description = "Allocation to Recruiter",
            Reason = "Allocation to Recruiter",
            CreatedAt = DateTime.UtcNow
        };
        context.CreditTransactions.Add(walletTx);

        // 2. Recruiter transaction (+200): Recruiter receives 200 credits
        var recruiterTx = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = recruiter.Id,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Credits = 200,
            BalanceBefore = 0,
            BalanceAfter = 200,
            CreatedByUserId = adminUserId,
            Description = "Allocated from Institution",
            Reason = "Allocated from Institution",
            CreatedAt = DateTime.UtcNow
        };
        context.CreditTransactions.Add(recruiterTx);
        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);

        // Act
        var result = await controller.GetCreditTransactions(search: null, transactionType: null, fromDate: null, toDate: null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var paginatedResult = Assert.IsType<PaginatedResultDto<CreditTransactionDto>>(okResult.Value);

        Assert.Equal(1, paginatedResult.TotalRecords);
        Assert.Single(paginatedResult.Items);
        var item = paginatedResult.Items.First();
        Assert.Equal(-200, item.Credits);
        Assert.Equal(800, item.BalanceAfter);
    }

    [Fact]
    public async Task GetRecruiterCreditTransactions_ReturnsOnlyRecruiterTransactions_ExcludesWalletOnlyTransactions()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var institution = new Institution { Name = "Test Inst", Code = "TI02" };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var institutionId = institution.Id;
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId });

        var recruiterUser = new User { FirstName = "Priya", LastName = "Sharma", Email = "priya@test.com", PasswordHash = "h" };
        context.Users.Add(recruiterUser);

        var recruiter = new Recruiter { UserId = recruiterUser.Id, InstitutionId = institutionId, Credits = 200 };
        context.Recruiters.Add(recruiter);
        await context.SaveChangesAsync();

        // 1. Wallet transaction (RecruiterId == null)
        var walletTx = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = null,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Credits = -200,
            BalanceBefore = 1000,
            BalanceAfter = 800,
            CreatedByUserId = adminUserId,
            Description = "Allocation to Recruiter",
            Reason = "Allocation to Recruiter",
            CreatedAt = DateTime.UtcNow
        };
        context.CreditTransactions.Add(walletTx);

        // 2. Recruiter transaction (RecruiterId != null)
        var recruiterTx = new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = recruiter.Id,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Credits = 200,
            BalanceBefore = 0,
            BalanceAfter = 200,
            CreatedByUserId = adminUserId,
            Description = "Allocated from Institution",
            Reason = "Allocated from Institution",
            CreatedAt = DateTime.UtcNow
        };
        context.CreditTransactions.Add(recruiterTx);
        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);

        // Act
        var result = await controller.GetRecruiterCreditTransactions(recruiterId: null, search: null, transactionType: null, fromDate: null, toDate: null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var paginatedResult = Assert.IsType<PaginatedResultDto<CreditTransactionDto>>(okResult.Value);

        Assert.Equal(1, paginatedResult.TotalRecords);
        Assert.Single(paginatedResult.Items);
        var item = paginatedResult.Items.First();
        Assert.Equal(200, item.Credits);
        Assert.Equal(200, item.BalanceAfter);
        Assert.Equal("Priya Sharma", item.RecruiterName);
        Assert.Equal("priya@test.com", item.RecruiterEmail);
    }

    [Fact]
    public async Task GetRecruiterCreditTransactions_FilterByRecruiterId_ReturnsOnlySpecificRecruiter()
    {
        // Arrange
        var options = GetDbContextOptions(Guid.NewGuid().ToString());
        using var context = new ApplicationDbContext(options);
        var adminUserId = Guid.NewGuid();

        var institution = new Institution { Name = "Test Inst", Code = "TI03" };
        context.Institutions.Add(institution);
        await context.SaveChangesAsync();

        var institutionId = institution.Id;
        context.InstituteAdminProfiles.Add(new InstituteAdminProfile { UserId = adminUserId, InstitutionId = institutionId });

        var user1 = new User { FirstName = "R1", LastName = "User", Email = "r1@test.com", PasswordHash = "h" };
        var user2 = new User { FirstName = "R2", LastName = "User", Email = "r2@test.com", PasswordHash = "h" };
        context.Users.AddRange(user1, user2);

        var recruiter1 = new Recruiter { UserId = user1.Id, InstitutionId = institutionId, Credits = 100 };
        var recruiter2 = new Recruiter { UserId = user2.Id, InstitutionId = institutionId, Credits = 200 };
        context.Recruiters.AddRange(recruiter1, recruiter2);
        await context.SaveChangesAsync();

        context.CreditTransactions.Add(new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = recruiter1.Id,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Credits = 100,
            BalanceBefore = 0,
            BalanceAfter = 100,
            CreatedByUserId = adminUserId,
            Description = "Allocated to R1",
            CreatedAt = DateTime.UtcNow
        });

        context.CreditTransactions.Add(new CreditTransaction
        {
            InstitutionId = institutionId,
            RecruiterId = recruiter2.Id,
            TransactionType = TransactionType.InstitutionToRecruiterAllocation,
            Credits = 200,
            BalanceBefore = 0,
            BalanceAfter = 200,
            CreatedByUserId = adminUserId,
            Description = "Allocated to R2",
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context, adminUserId);

        // Act - filter specifically for recruiter1
        var result = await controller.GetRecruiterCreditTransactions(recruiterId: recruiter1.Id, search: null, transactionType: null, fromDate: null, toDate: null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var paginatedResult = Assert.IsType<PaginatedResultDto<CreditTransactionDto>>(okResult.Value);

        Assert.Equal(1, paginatedResult.TotalRecords);
        Assert.Single(paginatedResult.Items);
        var item = paginatedResult.Items.First();
        Assert.Equal(100, item.Credits);
        Assert.Equal("R1 User", item.RecruiterName);
    }
}
