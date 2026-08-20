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
    
    public DbSet<CreditTransaction> CreditTransactions => Set<CreditTransaction>();
    public DbSet<RecruiterCreditRate> RecruiterCreditRates => Set<RecruiterCreditRate>();
    public DbSet<CandidateContactAccess> CandidateContactAccesses => Set<CandidateContactAccess>();
    public DbSet<JobApplicationComment> JobApplicationComments => Set<JobApplicationComment>();
    
    // New Institution Hierarchy and Credit Entities
    public DbSet<InstituteAdminProfile> InstituteAdminProfiles => Set<InstituteAdminProfile>();
    public DbSet<InstitutionCreditWallet> InstitutionCreditWallets => Set<InstitutionCreditWallet>();
    public DbSet<CreditPurchase> CreditPurchases => Set<CreditPurchase>();
    public DbSet<CreditPriceConfiguration> CreditPriceConfigurations => Set<CreditPriceConfiguration>();

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

        modelBuilder.Entity<InstitutionCreditWallet>()
            .Property(w => w.RowVersion)
            .IsRowVersion();

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
            .Property(c => c.ExServicemanBranch)
            .HasConversion<string>();
            
        modelBuilder.Entity<CreditTransaction>()
            .Property(t => t.TransactionType)
            .HasConversion<string>();
    }
}
