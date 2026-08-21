using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
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
        var controller = new InstituteAdminController(context, mockCreditService.Object);

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
}
