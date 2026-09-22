using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using MyNaukri.API.Controllers;
using MyNaukri.Application.DTOs.Auth;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using Xunit;

namespace MyNaukri.Tests;

public class AuthControllerSecurityTests
{
    private DbContextOptions<ApplicationDbContext> GetDbContextOptions(string dbName)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
    }

    [Fact]
    public async Task Login_ConsecutiveFailures_LocksAccountOnFifthAttempt()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_AuthLockout");
        using var context = new ApplicationDbContext(options);

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        mockHasher.Setup(h => h.Verify(It.IsAny<string>(), "correctPassword")).Returns(true);
        mockHasher.Setup(h => h.Verify(It.IsAny<string>(), "wrongPassword")).Returns(false);

        var mockNotify = new Mock<INotificationService>();

        var user = new User
        {
            Email = "lockout@test.com",
            PasswordHash = "hashedPassword",
            FirstName = "Test",
            LastName = "Lockout",
            Role = Role.Candidate,
            IsActive = true,
            FailedLoginAttempts = 4 // Already failed 4 times
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var mockStorage = new Mock<IStorageService>();
        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);

        // Act - 5th failed attempt
        var result = await controller.Login(new LoginDto { Email = "lockout@test.com", Password = "wrongPassword" });

        // Assert - Should return 429 Too Many Requests (ObjectResult with StatusCode 429)
        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(429, objResult.StatusCode);

        var updatedUser = await context.Users.FindAsync(user.Id);
        Assert.NotNull(updatedUser);
        Assert.NotNull(updatedUser!.LockoutEnd);
        Assert.True(updatedUser.LockoutEnd > DateTime.UtcNow);
    }

    [Fact]
    public async Task DeleteAccount_AnonymizesUserAndRevokesTokens()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_AuthDeleteAccount");
        using var context = new ApplicationDbContext(options);

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        var mockNotify = new Mock<INotificationService>();

        var user = new User
        {
            Email = "user@delete.me",
            PasswordHash = "hashedPassword",
            FirstName = "John",
            LastName = "Doe",
            Role = Role.Candidate,
            IsActive = true
        };
        context.Users.Add(user);

        var candidate = new Candidate
        {
            UserId = user.Id,
            PhoneNumber = "+1234567890",
            ResumeUrl = "https://blob.storage/resume.pdf",
            Summary = "Senior Software Engineer",
            DemoVideoUrl = "https://blob.storage/demo.mp4"
        };
        context.Candidates.Add(candidate);

        var token = new DeviceToken
        {
            UserId = user.Id,
            Token = "ExponentPushToken[xyz123]",
            Platform = "android"
        };
        context.DeviceTokens.Add(token);

        await context.SaveChangesAsync();

        var mockStorage = new Mock<IStorageService>();
        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        // Act
        var result = await controller.DeleteAccount();

        // Assert
        Assert.IsType<OkObjectResult>(result);

        var updatedUser = await context.Users.FindAsync(user.Id);
        Assert.NotNull(updatedUser);
        Assert.False(updatedUser!.IsActive);
        Assert.NotNull(updatedUser.DeletedAt);
        Assert.Contains("anonymized.local", updatedUser.Email);
        Assert.Equal("Deleted", updatedUser.FirstName);

        var updatedCandidate = await context.Candidates.FirstOrDefaultAsync(c => c.UserId == user.Id);
        Assert.NotNull(updatedCandidate);
        Assert.Empty(updatedCandidate!.PhoneNumber);
        Assert.Empty(updatedCandidate.ResumeUrl!);
        Assert.Empty(updatedCandidate.DemoVideoUrl!);

        var remainingTokens = await context.DeviceTokens.Where(d => d.UserId == user.Id).ToListAsync();
        Assert.Empty(remainingTokens);
    }

    [Fact]
    public async Task ChangePassword_WithValidCredentials_UpdatesHashAndReturnsOk()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_ChangePassword_Success");
        using var context = new ApplicationDbContext(options);

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        mockHasher.Setup(h => h.Verify("CurrentPassword123", "hashed_old")).Returns(true);
        mockHasher.Setup(h => h.Verify("NewPassword456", "hashed_old")).Returns(false);
        mockHasher.Setup(h => h.Hash("NewPassword456")).Returns("hashed_new");

        var mockNotify = new Mock<INotificationService>();
        var mockStorage = new Mock<IStorageService>();

        var user = new User
        {
            Email = "testuser@edukey360.com",
            PasswordHash = "hashed_old",
            FirstName = "Alice",
            LastName = "Smith",
            Role = Role.Candidate,
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        // Act
        var result = await controller.ChangePassword(new ChangePasswordDto
        {
            CurrentPassword = "CurrentPassword123",
            NewPassword = "NewPassword456"
        });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var updatedUser = await context.Users.FindAsync(user.Id);
        Assert.NotNull(updatedUser);
        Assert.Equal("hashed_new", updatedUser!.PasswordHash);
    }

    [Fact]
    public async Task ChangePassword_WithIncorrectCurrentPassword_ReturnsBadRequest()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_ChangePassword_WrongCurrent");
        using var context = new ApplicationDbContext(options);

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        mockHasher.Setup(h => h.Verify("WrongPassword", "hashed_old")).Returns(false);

        var mockNotify = new Mock<INotificationService>();
        var mockStorage = new Mock<IStorageService>();

        var user = new User
        {
            Email = "testuser2@edukey360.com",
            PasswordHash = "hashed_old",
            FirstName = "Bob",
            LastName = "Smith",
            Role = Role.Recruiter,
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        // Act
        var result = await controller.ChangePassword(new ChangePasswordDto
        {
            CurrentPassword = "WrongPassword",
            NewPassword = "NewPassword456"
        });

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Current password is incorrect.", badRequestResult.Value);
    }

    [Fact]
    public async Task ChangePassword_WithSamePassword_ReturnsBadRequest()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_ChangePassword_SamePassword");
        using var context = new ApplicationDbContext(options);

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        mockHasher.Setup(h => h.Verify("SamePassword123", "hashed_old")).Returns(true);

        var mockNotify = new Mock<INotificationService>();
        var mockStorage = new Mock<IStorageService>();

        var user = new User
        {
            Email = "testuser3@edukey360.com",
            PasswordHash = "hashed_old",
            FirstName = "Charlie",
            Role = Role.InstituteAdministrator,
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        // Act
        var result = await controller.ChangePassword(new ChangePasswordDto
        {
            CurrentPassword = "SamePassword123",
            NewPassword = "SamePassword123"
        });

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("New password cannot be the same as your current password.", badRequestResult.Value);
    }

    [Fact]
    public async Task ChangePassword_WithShortPassword_ReturnsBadRequest()
    {
        // Arrange
        var options = GetDbContextOptions("TestDb_ChangePassword_ShortPassword");
        using var context = new ApplicationDbContext(options);

        var mockJwt = new Mock<IJwtProvider>();
        var mockHasher = new Mock<IPasswordHasher>();
        var mockNotify = new Mock<INotificationService>();
        var mockStorage = new Mock<IStorageService>();

        var user = new User
        {
            Email = "testuser4@edukey360.com",
            PasswordHash = "hashed_old",
            FirstName = "David",
            Role = Role.Candidate,
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var controller = new AuthController(context, mockJwt.Object, mockHasher.Object, mockNotify.Object, mockStorage.Object);
        var claimsUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsUser }
        };

        // Act
        var result = await controller.ChangePassword(new ChangePasswordDto
        {
            CurrentPassword = "CurrentPassword123",
            NewPassword = "123" // under 6 chars
        });

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("New password must be at least 6 characters long.", badRequestResult.Value);
    }
}
