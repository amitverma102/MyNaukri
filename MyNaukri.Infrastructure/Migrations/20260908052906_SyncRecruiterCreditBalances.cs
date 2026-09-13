using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncRecruiterCreditBalances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""Recruiters"" r
                SET ""Credits"" = (
                    SELECT COALESCE(SUM(""RemainingQuantity""), 0)
                    FROM ""CreditBatches"" b
                    WHERE b.""RecruiterId"" = r.""Id""
                    AND b.""Status"" = 1
                )
                WHERE EXISTS (
                    SELECT 1 FROM ""CreditBatches"" b WHERE b.""RecruiterId"" = r.""Id""
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
