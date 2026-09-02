using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;

namespace MyNaukri.Infrastructure.Jobs;

public class ExpireCreditsJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpireCreditsJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24);

    public ExpireCreditsJob(IServiceProvider serviceProvider, ILogger<ExpireCreditsJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpireCreditsJob started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpireCreditsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while running ExpireCreditsJob.");
            }

            // Wait until next day
            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("ExpireCreditsJob is stopping.");
    }

    private async Task ExpireCreditsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var now = DateTime.UtcNow;

        // Find all active batches that have passed their expiry date
        var expiredBatches = await context.CreditBatches
            .Where(b => b.Status == CreditBatchStatus.Active && b.ExpiryDate <= now)
            .ToListAsync(stoppingToken);

        if (!expiredBatches.Any())
        {
            return;
        }

        _logger.LogInformation("Found {Count} expired credit batches to process.", expiredBatches.Count);

        using var transaction = await context.Database.BeginTransactionAsync(stoppingToken);
        try
        {
            var adminId = Guid.Empty; // System user

            foreach (var batch in expiredBatches)
            {
                int amountToExpire = batch.RemainingQuantity;
                if (amountToExpire <= 0)
                {
                    batch.Status = CreditBatchStatus.Depleted;
                    continue;
                }

                // Deduct from appropriate wallet
                if (batch.RecruiterId.HasValue)
                {
                    var recruiter = await context.Recruiters.FindAsync(new object[] { batch.RecruiterId.Value }, stoppingToken);
                    if (recruiter != null)
                    {
                        var balanceBefore = recruiter.Credits;
                        recruiter.Credits = Math.Max(0, recruiter.Credits - amountToExpire);
                        
                        var tx = new CreditTransaction
                        {
                            InstitutionId = batch.InstitutionId,
                            RecruiterId = batch.RecruiterId,
                            TransactionType = TransactionType.CreditExpiry,
                            Credits = -amountToExpire,
                            BalanceBefore = balanceBefore,
                            BalanceAfter = recruiter.Credits,
                            CreatedByUserId = adminId,
                            Description = "Credit Batch Expired"
                        };
                        context.CreditTransactions.Add(tx);
                        
                        context.CreditTransactionBatches.Add(new CreditTransactionBatch
                        {
                            CreditTransaction = tx,
                            CreditBatch = batch,
                            Quantity = amountToExpire
                        });
                    }
                }
                else
                {
                    var wallet = await context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == batch.InstitutionId, stoppingToken);
                    if (wallet != null)
                    {
                        var balanceBefore = wallet.AvailableCredits;
                        wallet.AvailableCredits = Math.Max(0, wallet.AvailableCredits - amountToExpire);

                        var tx = new CreditTransaction
                        {
                            InstitutionId = batch.InstitutionId,
                            TransactionType = TransactionType.CreditExpiry,
                            Credits = -amountToExpire,
                            BalanceBefore = balanceBefore,
                            BalanceAfter = wallet.AvailableCredits,
                            CreatedByUserId = adminId,
                            Description = "Credit Batch Expired"
                        };
                        context.CreditTransactions.Add(tx);
                        
                        context.CreditTransactionBatches.Add(new CreditTransactionBatch
                        {
                            CreditTransaction = tx,
                            CreditBatch = batch,
                            Quantity = amountToExpire
                        });
                    }
                }

                batch.RemainingQuantity = 0;
                batch.Status = CreditBatchStatus.Expired;
            }

            await context.SaveChangesAsync(stoppingToken);
            await transaction.CommitAsync(stoppingToken);

            _logger.LogInformation("Successfully expired {Count} credit batches.", expiredBatches.Count);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(stoppingToken);
            throw;
        }
    }
}
