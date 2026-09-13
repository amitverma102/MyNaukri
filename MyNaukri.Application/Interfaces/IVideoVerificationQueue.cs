using System.Threading.Channels;

namespace MyNaukri.Application.Interfaces;

public interface IVideoVerificationQueue
{
    ValueTask EnqueueAsync(Guid candidateId);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}
