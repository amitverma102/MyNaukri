using System.Threading.Channels;

namespace MyNaukri.Application.Interfaces;

public interface IResumeProcessingQueue
{
    ValueTask QueueResumeAsync(Guid resumeId);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}


