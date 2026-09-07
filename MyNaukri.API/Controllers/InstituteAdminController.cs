using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Infrastructure.Services;
using MyNaukri.Application.DTOs.SuperAdmin;
using System.Security.Claims;

namespace MyNaukri.API.Controllers;

[ApiController]
[Route("api/instituteadmin")]
[Authorize(Roles = "InstituteAdministrator")]
public class InstituteAdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInstitutionCreditService _institutionCreditService;
    private readonly ICreditLedgerService _creditLedgerService;
    private readonly IRazorpayService _razorpayService;

    public InstituteAdminController(ApplicationDbContext context, IInstitutionCreditService institutionCreditService, ICreditLedgerService creditLedgerService, IRazorpayService razorpayService)
    {
        _context = context;
        _institutionCreditService = institutionCreditService;
        _creditLedgerService = creditLedgerService;
        _razorpayService = razorpayService;
    }

    private async Task<Guid?> GetInstitutionIdAsync(Guid userId)
    {
        var profile = await _context.InstituteAdminProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        return profile?.InstitutionId;
    }

    [HttpGet("wallet")]
    public async Task<IActionResult> GetWallet()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid("User is not associated with any institution.");

        var wallet = await _institutionCreditService.GetWalletAsync(institutionId.Value);
        return Ok(wallet ?? new InstitutionCreditWallet { InstitutionId = institutionId.Value });
    }

    [HttpGet("wallet/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid("User is not associated with any institution.");

        var wallet = await _institutionCreditService.GetWalletAsync(institutionId.Value) 
                     ?? new InstitutionCreditWallet { InstitutionId = institutionId.Value };

        var batches = await _context.CreditBatches
            .Where(b => b.InstitutionId == institutionId.Value && b.RecruiterId == null && b.Status == CreditBatchStatus.Active && b.ExpiryDate >= DateTime.UtcNow)
            .OrderBy(b => b.ExpiryDate)
            .Select(b => new
            {
                b.Id,
                b.OriginalQuantity,
                b.RemainingQuantity,
                b.CreditType,
                b.ExpiryDate
            })
            .ToListAsync();

        var totalUnusedByRecruiters = await _context.Recruiters
            .Where(r => r.InstitutionId == institutionId.Value)
            .SumAsync(r => r.Credits);

        var unusedCredits = wallet.AvailableCredits + totalUnusedByRecruiters;

        return Ok(new
        {
            wallet.AvailableCredits,
            wallet.TotalPurchasedCredits,
            wallet.TotalAllocatedCredits,
            UnusedCredits = unusedCredits,
            Batches = batches
        });
    }

    [HttpPost("wallet/purchase")]
    public async Task<IActionResult> PurchaseCredits([FromBody] PurchaseCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var purchase = await _institutionCreditService.PurchaseCreditsAsync(institutionId.Value, dto.Credits, userId);
        return Ok(new { message = "Credits purchased successfully.", purchase });
    }

    [HttpGet("wallet/renewal-eligibility")]
    public async Task<IActionResult> GetRenewalEligibility()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var (unusedPercentage, discountPercentage, daysToExpiry, isEligible) = await _creditLedgerService.GetRenewalEligibilityAsync(institutionId.Value);

        return Ok(new
        {
            unusedPercentage,
            discountPercentage,
            daysToExpiry,
            isEligible
        });
    }

    [HttpGet("wallet/quote")]
    public async Task<IActionResult> GetQuote([FromQuery] int amount, [FromQuery] bool isEarlyRenewal)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        // Standard price is 1.0m (could come from config)
        var pricePerCredit = await _institutionCreditService.GetCurrentPricePerCreditAsync();
        var basePrice = amount * pricePerCredit;
        var finalPrice = basePrice;
        decimal discountPct = 0;
        decimal discountAmt = 0;

        if (isEarlyRenewal)
        {
            var (_, calculatedDiscount, _, isEligible) = await _creditLedgerService.GetRenewalEligibilityAsync(institutionId.Value);
            if (isEligible && calculatedDiscount > 0)
            {
                discountPct = calculatedDiscount;
                discountAmt = basePrice * (discountPct / 100m);
                finalPrice = basePrice - discountAmt;
            }
        }

        return Ok(new
        {
            amount,
            pricePerCredit,
            basePrice,
            discountPercentage = discountPct,
            discountAmount = discountAmt,
            finalPrice
        });
    }

    [HttpPost("wallet/topup")]
    public async Task<IActionResult> TopUpCredits([FromBody] PurchaseCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        // TopUp doesn't require early renewal discount
        var purchase = await _institutionCreditService.PurchaseCreditsAsync(institutionId.Value, dto.Credits, userId);
        return Ok(new { message = "Top-up successful.", purchase });
    }

    [HttpPost("wallet/annual-recharge")]
    public async Task<IActionResult> AnnualRecharge([FromBody] PurchaseCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var pricePerCredit = await _institutionCreditService.GetCurrentPricePerCreditAsync();
        var basePrice = dto.Credits * pricePerCredit;
        var finalPrice = basePrice;
        decimal discountPct = 0;
        decimal discountAmt = 0;

        var (_, calculatedDiscount, _, isEligible) = await _creditLedgerService.GetRenewalEligibilityAsync(institutionId.Value);
        if (isEligible && calculatedDiscount > 0)
        {
            discountPct = calculatedDiscount;
            discountAmt = basePrice * (discountPct / 100m);
            finalPrice = basePrice - discountAmt;
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var wallet = await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId.Value);
            if (wallet == null)
            {
                wallet = new InstitutionCreditWallet { InstitutionId = institutionId.Value };
                _context.InstitutionCreditWallets.Add(wallet);
            }
            wallet.TotalPurchasedCredits += dto.Credits;

            var batch = await _creditLedgerService.IssueCreditsAsync(
                institutionId: institutionId.Value,
                recruiterId: null,
                creditType: CreditType.AnnualRecharge,
                amount: dto.Credits,
                expiryDate: DateTime.UtcNow.AddYears(1), // Fixed 1 year expiry
                performedByUserId: userId,
                transactionType: TransactionType.InstitutionCreditPurchase,
                description: "Annual Recharge" + (discountPct > 0 ? $" with {discountPct:0.##}% early renewal discount" : ""),
                price: pricePerCredit,
                discountPct: discountPct,
                discountAmt: discountAmt,
                finalPrice: finalPrice
            );

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Annual recharge successful.", transaction = batch?.SourceTransaction });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpGet("wallet/transactions")]
    public async Task<IActionResult> GetCreditTransactions(
        [FromQuery] string? search,
        [FromQuery] TransactionType? transactionType,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string sortBy = "date",
        [FromQuery] string sortDirection = "desc")
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.CreditTransactions
            .Include(t => t.Institution)
            .Include(t => t.CreatedByUser)
            .AsNoTracking()
            .Where(t => t.InstitutionId == institutionId.Value);

        if (transactionType.HasValue)
            query = query.Where(t => t.TransactionType == transactionType.Value);

        if (fromDate.HasValue)
            query = query.Where(t => t.CreatedAt >= fromDate.Value.ToUniversalTime());

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.ToUniversalTime().AddDays(1).AddTicks(-1);
            query = query.Where(t => t.CreatedAt <= endOfDay);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(t => 
                t.Id.ToString().ToLower().Contains(searchLower) ||
                (t.CreatedByUser != null && (t.CreatedByUser.FirstName.ToLower().Contains(searchLower) || t.CreatedByUser.LastName.ToLower().Contains(searchLower))) ||
                (t.Description != null && t.Description.ToLower().Contains(searchLower)) ||
                (t.Reason != null && t.Reason.ToLower().Contains(searchLower)) ||
                (t.ReferenceId != null && t.ReferenceId.ToLower().Contains(searchLower))
            );
        }

        var totalRecords = await query.CountAsync();

        bool isDesc = sortDirection.ToLower() == "desc";
        query = sortBy.ToLower() switch
        {
            "credits" => isDesc ? query.OrderByDescending(t => t.Credits) : query.OrderBy(t => t.Credits),
            "user" => isDesc ? query.OrderByDescending(t => t.CreatedByUser!.FirstName) : query.OrderBy(t => t.CreatedByUser!.FirstName),
            "transactiontype" => isDesc ? query.OrderByDescending(t => t.TransactionType) : query.OrderBy(t => t.TransactionType),
            _ => isDesc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt)
        };

        var transactions = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new CreditTransactionDto
            {
                TransactionId = $"TXN-{t.Id.ToString().Substring(0, 8).ToUpper()}",
                InstitutionId = t.InstitutionId,
                InstitutionName = t.Institution.Name,
                UserId = t.CreatedByUserId,
                UserName = t.CreatedByUser != null ? $"{t.CreatedByUser.FirstName} {t.CreatedByUser.LastName}" : string.Empty,
                TransactionType = t.TransactionType.ToString(),
                Credits = t.Credits,
                BalanceBefore = t.BalanceBefore,
                BalanceAfter = t.BalanceAfter,
                Description = t.Description ?? string.Empty,
                Reason = t.Reason,
                CreatedDate = t.CreatedAt
            })
            .ToListAsync();

        return Ok(new PaginatedResultDto<CreditTransactionDto>
        {
            Items = transactions,
            Page = page,
            PageSize = pageSize,
            TotalRecords = totalRecords
        });
    }

    [HttpPost("wallet/create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var pricePerCredit = await _institutionCreditService.GetCurrentPricePerCreditAsync();
        var basePrice = request.Credits * pricePerCredit;
        var finalPrice = basePrice;

        if (request.IsAnnualRecharge)
        {
            var (_, calculatedDiscount, _, isEligible) = await _creditLedgerService.GetRenewalEligibilityAsync(institutionId.Value);
            if (isEligible && calculatedDiscount > 0)
            {
                var discountAmt = basePrice * (calculatedDiscount / 100m);
                finalPrice = basePrice - discountAmt;
            }
        }

        var receiptId = Guid.NewGuid().ToString("N");
        var notes = new Dictionary<string, string>
        {
            { "institutionId", institutionId.Value.ToString() },
            { "userId", userId.ToString() },
            { "credits", request.Credits.ToString() },
            { "isAnnualRecharge", request.IsAnnualRecharge.ToString() }
        };

        string orderId;
        try
        {
            orderId = await _razorpayService.CreateOrderAsync(finalPrice, receiptId, notes);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Payment gateway error: {ex.Message}" });
        }

        // Store the pending purchase in the DB so we can verify it later
        var purchase = new CreditPurchase
        {
            InstitutionId = institutionId.Value,
            CreditsPurchased = request.Credits,
            PricePerCredit = pricePerCredit,
            TotalAmount = finalPrice,
            Currency = "INR",
            PurchasedByUserId = userId,
            PurchasedBy = await _context.Users.FindAsync(userId),
            PaymentStatus = PaymentStatus.Pending,
            PaymentReference = orderId, // Store the razorpay order_id here
            Notes = request.IsAnnualRecharge ? "Annual Recharge Order" : "TopUp Order"
        };
        _context.CreditPurchases.Add(purchase);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            orderId = orderId,
            amount = finalPrice,
            currency = "INR",
            key = _razorpayService.GetPublicKey()
        });
    }

    [HttpPost("wallet/verify-payment")]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var isSignatureValid = _razorpayService.VerifyPaymentSignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature);
        if (!isSignatureValid)
        {
            return BadRequest(new { message = "Invalid payment signature." });
        }

        var purchase = await _context.CreditPurchases.FirstOrDefaultAsync(p => p.PaymentReference == request.RazorpayOrderId);
        if (purchase == null)
        {
            return NotFound(new { message = "Order not found." });
        }

        if (purchase.PaymentStatus == PaymentStatus.Successful)
        {
            return Ok(new { message = "Payment already processed." });
        }

        purchase.PaymentStatus = PaymentStatus.Successful;
        purchase.PaymentReference = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var wallet = await _context.InstitutionCreditWallets.FirstOrDefaultAsync(w => w.InstitutionId == institutionId.Value);
            if (wallet == null)
            {
                wallet = new InstitutionCreditWallet { InstitutionId = institutionId.Value };
                _context.InstitutionCreditWallets.Add(wallet);
            }
            wallet.TotalPurchasedCredits += purchase.CreditsPurchased;

            var isAnnualRecharge = purchase.Notes == "Annual Recharge Order";
            var description = isAnnualRecharge ? "Annual Recharge via Razorpay" : "TopUp via Razorpay";
            var expiry = isAnnualRecharge ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(12);

            var batch = await _creditLedgerService.IssueCreditsAsync(
                institutionId: institutionId.Value,
                recruiterId: null,
                creditType: isAnnualRecharge ? CreditType.AnnualRecharge : CreditType.TopUp,
                amount: purchase.CreditsPurchased,
                expiryDate: expiry,
                performedByUserId: userId,
                transactionType: TransactionType.InstitutionCreditPurchase,
                description: description,
                price: purchase.PricePerCredit,
                finalPrice: purchase.TotalAmount
            );

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Payment verified and credits added successfully." });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpGet("recruiters/summary")]
    public async Task<IActionResult> GetRecruitersSummary()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var institution = await _context.Institutions.FindAsync(institutionId.Value);
        if (institution == null) return Forbid();

        var currentRecruiters = await _context.Recruiters
            .Include(r => r.User)
            .CountAsync(r => r.InstitutionId == institutionId.Value && r.User.IsActive);

        var availableSlots = Math.Max(0, institution.MaxRecruiters - currentRecruiters);
        
        return Ok(new
        {
            maxRecruiters = institution.MaxRecruiters,
            currentRecruiters,
            availableSlots,
            canCreateRecruiter = availableSlots > 0
        });
    }

    [HttpGet("recruiters")]
    public async Task<IActionResult> GetRecruiters([FromQuery] string? search, [FromQuery] string? status)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var query = _context.Recruiters
            .Include(r => r.User)
            .Where(r => r.InstitutionId == institutionId.Value)
            .AsQueryable();
            
        if (!string.IsNullOrEmpty(status))
        {
            if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => r.User.IsActive);
            else if (status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => !r.User.IsActive);
        }

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(r => r.User.FirstName.ToLower().Contains(s) || 
                                     r.User.LastName.ToLower().Contains(s) || 
                                     r.User.Email.ToLower().Contains(s) ||
                                     r.Mobile.Contains(s));
        }

        var recruiters = await query
            .Select(r => new {
                r.Id,
                r.User.FirstName,
                r.User.LastName,
                r.User.Email,
                r.Mobile,
                r.Designation,
                r.Department,
                r.Credits,
                r.User.IsActive,
                r.CreatedAt
            })
            .ToListAsync();
            
        return Ok(recruiters);
    }

    [HttpPost("recruiters/{recruiterId}/allocate")]
    public async Task<IActionResult> AllocateCredits(Guid recruiterId, [FromBody] AllocateCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var success = await _institutionCreditService.AllocateToRecruiterAsync(institutionId.Value, recruiterId, dto.Credits, userId, dto.Reason);
        if (!success) return BadRequest("Failed to allocate credits. Check institution balance and recruiter validity.");

        return Ok(new { message = "Credits allocated successfully." });
    }

    [HttpPost("recruiters/{recruiterId}/revoke")]
    public async Task<IActionResult> RevokeCredits(Guid recruiterId, [FromBody] AllocateCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var success = await _institutionCreditService.RevokeFromRecruiterAsync(institutionId.Value, recruiterId, dto.Credits, userId, dto.Reason);
        if (!success) return BadRequest("Failed to revoke credits. Check recruiter balance and validity.");

        return Ok(new { message = "Credits revoked successfully." });
    }

    [HttpPost("recruiters/transfer")]
    public async Task<IActionResult> TransferCredits([FromBody] TransferCreditsDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var success = await _institutionCreditService.TransferBetweenRecruitersAsync(institutionId.Value, dto.FromRecruiterId, dto.ToRecruiterId, dto.Credits, userId, dto.Reason);
        if (!success) return BadRequest("Failed to transfer credits.");

        return Ok(new { message = "Credits transferred successfully." });
    }

    [HttpPost("recruiters")]
    public async Task<IActionResult> CreateRecruiter([FromBody] CreateRecruiterDto dto, [FromServices] MyNaukri.Application.Interfaces.IPasswordHasher passwordHasher)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var institution = await _context.Institutions.FindAsync(institutionId.Value);
            if (institution == null) return Forbid();

            var currentRecruiters = await _context.Recruiters
                .Include(r => r.User)
                .CountAsync(r => r.InstitutionId == institutionId.Value && r.User.IsActive);
                
            if (currentRecruiters >= institution.MaxRecruiters)
            {
                return Conflict(new {
                    code = "MAX_RECRUITER_LIMIT_REACHED",
                    message = "Your institution has reached its maximum recruiter limit.",
                    maxRecruiters = institution.MaxRecruiters,
                    currentRecruiters = currentRecruiters,
                    availableSlots = 0
                });
            }

            var emailLower = dto.Email.ToLower();
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == emailLower))
            {
                return BadRequest("Email already exists.");
            }

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PasswordHash = passwordHasher.Hash(dto.Password),
                Role = Role.Recruiter,
                IsEmailVerified = true, // Auto-verified since created by admin
                VerificationOtp = string.Empty,
                VerificationOtpExpiry = DateTime.UtcNow
            };

            _context.Users.Add(user);
            
            var recruiter = new Recruiter
            {
                UserId = user.Id,
                InstitutionId = institutionId.Value,
                Designation = dto.Designation,
                Mobile = dto.Mobile,
                Department = dto.Department,
                Credits = 0
            };
            
            _context.Recruiters.Add(recruiter);
            
            var creditRate = new RecruiterCreditRate
            {
                Recruiter = recruiter,
                ResumeDownloadRate = 5,
                ContactViewRate = 2,
                BulkProfileDownloadRate = 2,
                NormalJobPostingRate = 20,
                PlatinumJobPostingRate = 40,
                CandidateEmailRate = 3
            };
            _context.RecruiterCreditRates.Add(creditRate);
            
            _context.AuditLogs.Add(new AuditLog {
                Action = "CREATE_RECRUITER",
                PerformedByUserId = userId,
                Role = Role.InstituteAdministrator,
                InstitutionId = institutionId.Value,
                Details = $"Created recruiter {dto.Email}"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Recruiter created successfully.", recruiterId = recruiter.Id });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "An error occurred while creating the recruiter.");
        }
    }

    [HttpPut("recruiters/{id}")]
    public async Task<IActionResult> UpdateRecruiter(Guid id, [FromBody] UpdateRecruiterDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var recruiter = await _context.Recruiters
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id && r.InstitutionId == institutionId.Value);

        if (recruiter == null) return NotFound("Recruiter not found.");

        recruiter.User.FirstName = dto.FirstName;
        recruiter.User.LastName = dto.LastName;
        recruiter.Mobile = dto.Mobile;
        recruiter.Designation = dto.Designation;
        recruiter.Department = dto.Department;

        _context.AuditLogs.Add(new AuditLog {
            Action = "UPDATE_RECRUITER",
            PerformedByUserId = userId,
            Role = Role.InstituteAdministrator,
            InstitutionId = institutionId.Value,
            Details = $"Updated recruiter {recruiter.User.Email}"
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Recruiter updated successfully." });
    }

    [HttpDelete("recruiters/{id}")]
    public async Task<IActionResult> DeactivateRecruiter(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        var recruiter = await _context.Recruiters
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id && r.InstitutionId == institutionId.Value);

        if (recruiter == null) return NotFound("Recruiter not found.");

        if (!recruiter.User.IsActive) return BadRequest("Recruiter is already inactive.");

        recruiter.User.IsActive = false;

        _context.AuditLogs.Add(new AuditLog {
            Action = "DEACTIVATE_RECRUITER",
            PerformedByUserId = userId,
            Role = Role.InstituteAdministrator,
            InstitutionId = institutionId.Value,
            Details = $"Deactivated recruiter {recruiter.User.Email}"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Recruiter deactivated successfully." });
    }

    [HttpPost("recruiters/{id}/reactivate")]
    public async Task<IActionResult> ReactivateRecruiter(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var institutionId = await GetInstitutionIdAsync(userId);
        if (institutionId == null) return Forbid();

        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var institution = await _context.Institutions.FindAsync(institutionId.Value);
            if (institution == null) return Forbid();

            var recruiter = await _context.Recruiters
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Id == id && r.InstitutionId == institutionId.Value);

            if (recruiter == null) return NotFound("Recruiter not found.");

            if (recruiter.User.IsActive) return BadRequest("Recruiter is already active.");

            var currentRecruiters = await _context.Recruiters
                .Include(r => r.User)
                .CountAsync(r => r.InstitutionId == institutionId.Value && r.User.IsActive);

            if (currentRecruiters >= institution.MaxRecruiters)
            {
                return Conflict(new {
                    code = "MAX_RECRUITER_LIMIT_REACHED",
                    message = "Cannot reactivate this recruiter because your institution has reached its maximum recruiter limit."
                });
            }

            recruiter.User.IsActive = true;

            _context.AuditLogs.Add(new AuditLog {
                Action = "REACTIVATE_RECRUITER",
                PerformedByUserId = userId,
                Role = Role.InstituteAdministrator,
                InstitutionId = institutionId.Value,
                Details = $"Reactivated recruiter {recruiter.User.Email}"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Recruiter reactivated successfully." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "An error occurred while reactivating the recruiter.");
        }
    }
}

public class CreateRecruiterDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
}

public class UpdateRecruiterDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
}

public class PurchaseCreditsDto
{
    public int Credits { get; set; }
}

public class CreateOrderRequest
{
    public int Credits { get; set; }
    public bool IsAnnualRecharge { get; set; }
}

public class VerifyPaymentRequest
{
    public string RazorpayPaymentId { get; set; } = string.Empty;
    public string RazorpayOrderId { get; set; } = string.Empty;
    public string RazorpaySignature { get; set; } = string.Empty;
}

public class AllocateCreditsDto
{
    public int Credits { get; set; }
    public string? Reason { get; set; }
}

public class TransferCreditsDto
{
    public Guid FromRecruiterId { get; set; }
    public Guid ToRecruiterId { get; set; }
    public int Credits { get; set; }
    public string? Reason { get; set; }
}
