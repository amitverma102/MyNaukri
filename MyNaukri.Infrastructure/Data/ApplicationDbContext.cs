using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;

namespace MyNaukri.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<Recruiter> Recruiters => Set<Recruiter>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<SavedJob> SavedJobs => Set<SavedJob>();
    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<Resume> Resumes => Set<Resume>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<CandidateSkill> CandidateSkills => Set<CandidateSkill>();
    
    public DbSet<CreditTransaction> CreditTransactions => Set<CreditTransaction>();
    public DbSet<RecruiterCreditRate> RecruiterCreditRates => Set<RecruiterCreditRate>();
    public DbSet<CandidateContactAccess> CandidateContactAccesses => Set<CandidateContactAccess>();
    public DbSet<JobApplicationComment> JobApplicationComments => Set<JobApplicationComment>();
    
    // New Institution Hierarchy and Credit Entities
    public DbSet<InstituteAdminProfile> InstituteAdminProfiles { get; set; } = null!;
    public DbSet<InstitutionCreditWallet> InstitutionCreditWallets { get; set; } = null!;
    public DbSet<CreditPurchase> CreditPurchases { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<CreditPriceConfiguration> CreditPriceConfigurations => Set<CreditPriceConfiguration>();
    public DbSet<CreditBatch> CreditBatches => Set<CreditBatch>();
    public DbSet<CreditTransactionBatch> CreditTransactionBatches => Set<CreditTransactionBatch>();
    public DbSet<RechargePlan> RechargePlans => Set<RechargePlan>();
    public DbSet<DeviceToken> DeviceTokens => Set<DeviceToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        
        modelBuilder.Entity<Job>()
            .HasOne(j => j.Recruiter)
            .WithMany(r => r.PostedJobs)
            .HasForeignKey(j => j.RecruiterId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Job>()
            .HasOne(j => j.Institution)
            .WithMany(i => i.Jobs)
            .HasForeignKey(j => j.InstitutionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JobApplication>()
            .HasOne(a => a.Candidate)
            .WithMany(c => c.Applications)
            .HasForeignKey(a => a.CandidateId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JobApplication>()
            .HasOne(a => a.Job)
            .WithMany(j => j.Applications)
            .HasForeignKey(a => a.JobId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SavedJob>()
            .HasOne(s => s.Candidate)
            .WithMany() // No collection on Candidate for SavedJobs yet, can leave empty
            .HasForeignKey(s => s.CandidateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Resume>()
            .HasOne(r => r.Candidate)
            .WithMany(c => c.Resumes)
            .HasForeignKey(r => r.CandidateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Resume>()
            .Property(r => r.ParsingStatus)
            .HasConversion<string>();

        modelBuilder.Entity<CandidateSkill>()
            .HasKey(cs => new { cs.CandidateId, cs.SkillId });

        modelBuilder.Entity<CandidateSkill>()
            .HasOne(cs => cs.Candidate)
            .WithMany(c => c.CandidateSkills)
            .HasForeignKey(cs => cs.CandidateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CandidateSkill>()
            .HasOne(cs => cs.Skill)
            .WithMany(s => s.CandidateSkills)
            .HasForeignKey(cs => cs.SkillId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Skill>()
            .HasIndex(s => s.NormalizedName)
            .IsUnique();

        modelBuilder.Entity<SavedJob>()
            .HasOne(s => s.Job)
            .WithMany()
            .HasForeignKey(s => s.JobId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<Recruiter>()
            .HasOne(r => r.Institution)
            .WithMany(i => i.Recruiters)
            .HasForeignKey(r => r.InstitutionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InstituteAdminProfile>()
            .HasOne(p => p.Institution)
            .WithMany(i => i.InstituteAdmins)
            .HasForeignKey(p => p.InstitutionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InstituteAdminProfile>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InstitutionCreditWallet>()
            .HasOne(w => w.Institution)
            .WithOne(i => i.CreditWallet)
            .HasForeignKey<InstitutionCreditWallet>(w => w.InstitutionId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Removed RowVersion for InstitutionCreditWallet as we rely on explicit transactions

        modelBuilder.Entity<CreditPurchase>()
            .HasOne(p => p.Institution)
            .WithMany(i => i.CreditPurchases)
            .HasForeignKey(p => p.InstitutionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CreditPurchase>()
            .Property(p => p.PaymentStatus)
            .HasConversion<string>();

        modelBuilder.Entity<Institution>()
            .Property(i => i.Type)
            .HasConversion<string>();

        modelBuilder.Entity<Institution>()
            .Property(i => i.Status)
            .HasConversion<string>();

        modelBuilder.Entity<CandidateContactAccess>()
            .HasIndex(cca => new { cca.RecruiterId, cca.CandidateId })
            .IsUnique();

        modelBuilder.Entity<RecruiterCreditRate>()
            .HasIndex(rcr => rcr.RecruiterId)
            .IsUnique();

        modelBuilder.Entity<JobApplicationComment>()
            .HasOne(jac => jac.JobApplication)
            .WithMany(ja => ja.Comments)
            .HasForeignKey(jac => jac.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<CandidateContactAccess>()
            .HasOne(cca => cca.Recruiter)
            .WithMany(r => r.ContactAccesses)
            .HasForeignKey(cca => cca.RecruiterId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<CreditTransaction>()
            .HasOne(ct => ct.Institution)
            .WithMany(i => i.CreditTransactions)
            .HasForeignKey(ct => ct.InstitutionId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<CreditTransaction>()
            .HasOne(ct => ct.Recruiter)
            .WithMany(r => r.CreditTransactions)
            .HasForeignKey(ct => ct.RecruiterId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<Candidate>()
            .Property(c => c.Gender)
            .HasConversion<string>();
            
        modelBuilder.Entity<Candidate>()
            .Property(c => c.ProfileSource)
            .HasConversion<string>();
            
        modelBuilder.Entity<Candidate>()
            .Property(c => c.ExServicemanBranch)
            .HasConversion<string>();
            
        modelBuilder.Entity<CreditTransaction>()
            .Property(t => t.TransactionType)
            .HasConversion<string>();

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.PerformedByUser)
            .WithMany()
            .HasForeignKey(a => a.PerformedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.Institution)
            .WithMany()
            .HasForeignKey(a => a.InstitutionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AuditLog>()
            .Property(a => a.Role)
            .HasConversion<string>();

        modelBuilder.Entity<CreditBatch>()
            .HasOne(cb => cb.Institution)
            .WithMany()
            .HasForeignKey(cb => cb.InstitutionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CreditBatch>()
            .HasOne(cb => cb.Recruiter)
            .WithMany()
            .HasForeignKey(cb => cb.RecruiterId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<CreditTransactionBatch>()
            .HasOne(ctb => ctb.CreditTransaction)
            .WithMany()
            .HasForeignKey(ctb => ctb.CreditTransactionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CreditTransactionBatch>()
            .HasOne(ctb => ctb.CreditBatch)
            .WithMany()
            .HasForeignKey(ctb => ctb.CreditBatchId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DeviceToken>()
            .HasOne(dt => dt.User)
            .WithMany(u => u.DeviceTokens)
            .HasForeignKey(dt => dt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries<MyNaukri.Domain.Common.BaseEntity>();
        var utcNow = DateTime.UtcNow;
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default)
                {
                    entry.Entity.CreatedAt = utcNow;
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = utcNow;
            }
        }
    }
}
