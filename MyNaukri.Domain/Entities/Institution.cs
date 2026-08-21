using MyNaukri.Domain.Common;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Domain.Entities;

public class Institution : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public InstitutionType Type { get; set; } = InstitutionType.School;
    public string Description { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PINCode { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public InstitutionStatus Status { get; set; } = InstitutionStatus.Active;
    public int MaxRecruiters { get; set; } = 5;
    
    public ICollection<Recruiter> Recruiters { get; set; } = new List<Recruiter>();
    public ICollection<Job> Jobs { get; set; } = new List<Job>();
    public ICollection<InstituteAdminProfile> InstituteAdmins { get; set; } = new List<InstituteAdminProfile>();
    
    // Credit Wallet
    public InstitutionCreditWallet? CreditWallet { get; set; }
    public ICollection<CreditPurchase> CreditPurchases { get; set; } = new List<CreditPurchase>();
    public ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();
}
