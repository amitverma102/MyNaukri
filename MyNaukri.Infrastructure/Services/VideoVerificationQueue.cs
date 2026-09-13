using System.Threading.Channels;
using MyNaukri.Application.Interfaces;

namespace MyNaukri.Infrastructure.Services;

public class VideoVerificationQueue : IVideoVerificationQueue
{
    private readonly Channel<Guid> _queue;

    public VideoVerificationQueue()
    {
        var options = new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<Guid>(options);
    }

    public async ValueTask EnqueueAsync(Guid candidateId)
    {
        await _queue.Writer.WriteAsync(candidateId);
    }

    public async ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}
