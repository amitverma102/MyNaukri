namespace MyNaukri.Domain.Enums;

public enum TransactionType
{
    InstitutionCreditPurchase = 1,
    InstitutionAdminCredit = 2,
    InstitutionToRecruiterAllocation = 3,
    RecruiterToRecruiterTransfer = 4,
    RecruiterResumeDownload = 5,
    RecruiterContactView = 6,
    RecruiterBulkDownload = 7,
    RecruiterNormalJobPosting = 8,
    RecruiterPlatinumJobPosting = 9,
    RecruiterCandidateEmail = 10,
    CreditRefund = 11,
    CreditAdjustment = 12,
    SuperAdminCreditAllocation = 13,
    CreditExpiry = 14,
    TopUp = 15,
    AnnualRecharge = 16
}
