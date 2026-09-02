using System.Threading.Channels;
using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services {
public class ResumeProcessingQueue : IResumeProcessingQueue
{
    private readonly Channel<Guid> _queue;

    public ResumeProcessingQueue()
    {
        var options = new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<Guid>(options);
    }

    public async ValueTask QueueResumeAsync(Guid resumeId)
    {
        await _queue.Writer.WriteAsync(resumeId);
    }

    public async ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}
}
