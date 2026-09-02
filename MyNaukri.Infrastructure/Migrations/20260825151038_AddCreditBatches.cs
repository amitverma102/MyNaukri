using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentExpiryDate",
                table: "InstitutionCreditWallets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "CreditTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPercentage",
                table: "CreditTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiryDate",
                table: "CreditTransactions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FinalPrice",
                table: "CreditTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceBeforeDiscount",
                table: "CreditTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CreditBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreditType = table.Column<int>(type: "integer", nullable: false),
                    OriginalQuantity = table.Column<int>(type: "integer", nullable: false),
                    RemainingQuantity = table.Column<int>(type: "integer", nullable: false),
                    IssuedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SourceTransactionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditBatches_CreditTransactions_SourceTransactionId",
                        column: x => x.SourceTransactionId,
                        principalTable: "CreditTransactions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CreditBatches_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CreditBatches_Recruiters_RecruiterId",
                        column: x => x.RecruiterId,
                        principalTable: "Recruiters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RechargePlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    DurationValue = table.Column<int>(type: "integer", nullable: false),
                    DurationUnit = table.Column<int>(type: "integer", nullable: false),
                    BasePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Credits = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RechargePlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CreditTransactionBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditTransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditBatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditTransactionBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditTransactionBatches_CreditBatches_CreditBatchId",
                        column: x => x.CreditBatchId,
                        principalTable: "CreditBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CreditTransactionBatches_CreditTransactions_CreditTransacti~",
                        column: x => x.CreditTransactionId,
                        principalTable: "CreditTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CreditBatches_InstitutionId",
                table: "CreditBatches",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditBatches_RecruiterId",
                table: "CreditBatches",
                column: "RecruiterId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditBatches_SourceTransactionId",
                table: "CreditBatches",
                column: "SourceTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactionBatches_CreditBatchId",
                table: "CreditTransactionBatches",
                column: "CreditBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactionBatches_CreditTransactionId",
                table: "CreditTransactionBatches",
                column: "CreditTransactionId");

            // Data Migration for existing credits
            migrationBuilder.Sql(@"
                -- Fix Institution Wallets TotalPurchasedCredits if it is 0
                UPDATE ""InstitutionCreditWallets""
                SET ""TotalPurchasedCredits"" = ""AvailableCredits"" + ""TotalAllocatedCredits""
                WHERE ""TotalPurchasedCredits"" = 0;

                -- Update Institution Wallets to set an initial CurrentExpiryDate (12 months from now)
                UPDATE ""InstitutionCreditWallets""
                SET ""CurrentExpiryDate"" = CURRENT_DATE + INTERVAL '1 year'
                WHERE ""AvailableCredits"" > 0;

                -- Migrate Institution credits to CreditBatches
                INSERT INTO ""CreditBatches"" (""Id"", ""InstitutionId"", ""RecruiterId"", ""CreditType"", ""OriginalQuantity"", ""RemainingQuantity"", ""IssuedDate"", ""ExpiryDate"", ""Status"", ""CreatedAt"", ""UpdatedAt"")
                SELECT 
                    gen_random_uuid(), 
                    ""InstitutionId"", 
                    NULL, 
                    1,
                    ""TotalPurchasedCredits"", 
                    ""AvailableCredits"", 
                    CURRENT_TIMESTAMP, 
                    CURRENT_DATE + INTERVAL '1 year', 
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM ""InstitutionCreditWallets""
                WHERE ""AvailableCredits"" > 0;

                -- Migrate Recruiter credits to CreditBatches
                INSERT INTO ""CreditBatches"" (""Id"", ""InstitutionId"", ""RecruiterId"", ""CreditType"", ""OriginalQuantity"", ""RemainingQuantity"", ""IssuedDate"", ""ExpiryDate"", ""Status"", ""CreatedAt"", ""UpdatedAt"")
                SELECT 
                    gen_random_uuid(), 
                    ""InstitutionId"", 
                    ""Id"", 
                    1,
                    ""Credits"", 
                    ""Credits"", 
                    CURRENT_TIMESTAMP, 
                    CURRENT_DATE + INTERVAL '1 year', 
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM ""Recruiters""
                WHERE ""Credits"" > 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CreditTransactionBatches");

            migrationBuilder.DropTable(
                name: "RechargePlans");

            migrationBuilder.DropTable(
                name: "CreditBatches");

            migrationBuilder.DropColumn(
                name: "CurrentExpiryDate",
                table: "InstitutionCreditWallets");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "CreditTransactions");

            migrationBuilder.DropColumn(
                name: "DiscountPercentage",
                table: "CreditTransactions");

            migrationBuilder.DropColumn(
                name: "ExpiryDate",
                table: "CreditTransactions");

            migrationBuilder.DropColumn(
                name: "FinalPrice",
                table: "CreditTransactions");

            migrationBuilder.DropColumn(
                name: "PriceBeforeDiscount",
                table: "CreditTransactions");
        }
    }
}
