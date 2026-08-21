using MyNaukri.Domain.Entities;

namespace MyNaukri.Application.Interfaces;

public interface IJwtProvider
{
    string Generate(User user, Guid? sessionId = null);
}
