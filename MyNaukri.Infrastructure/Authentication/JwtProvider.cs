using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;

namespace MyNaukri.Infrastructure.Authentication;

public class JwtProvider : IJwtProvider
{
    private readonly JwtOptions _options;

    public JwtProvider(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public string Generate(User user, Guid? sessionId = null)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var displayName = !string.IsNullOrWhiteSpace(fullName) ? fullName : (user.Email.Contains('@') ? user.Email.Split('@')[0] : user.Email);
        var firstName = !string.IsNullOrWhiteSpace(user.FirstName) ? user.FirstName : displayName;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(ClaimTypes.Name, displayName),
            new(ClaimTypes.GivenName, firstName),
            new(ClaimTypes.Surname, user.LastName ?? string.Empty),
            new("name", displayName),
            new("firstName", firstName),
            new("lastName", user.LastName ?? string.Empty)
        };

        if (sessionId.HasValue)
        {
            claims.Add(new Claim("SessionId", sessionId.Value.ToString()));
        }

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            _options.Issuer,
            _options.Audience,
            claims,
            null,
            DateTime.UtcNow.AddHours(1),
            signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
