using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixWalletBalancesSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""InstitutionCreditWallets"" w
                SET ""AvailableCredits"" = (
                    SELECT COALESCE(SUM(""RemainingQuantity""), 0)
                    FROM ""CreditBatches"" b
                    WHERE b.""InstitutionId"" = w.""InstitutionId""
                    AND b.""RecruiterId"" IS NULL
                    AND b.""Status"" = 1
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
