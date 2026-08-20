using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInstitutionCreditHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecruiterCreditTransactions");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PINCode",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Institutions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CreditPriceConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PricePerCredit = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditPriceConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditPriceConfigurations_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CreditPurchases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditsPurchased = table.Column<int>(type: "integer", nullable: false),
                    PricePerCredit = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaymentReference = table.Column<string>(type: "text", nullable: true),
                    PaymentStatus = table.Column<string>(type: "text", nullable: false),
                    PurchasedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchasedById = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditPurchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditPurchases_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CreditPurchases_Users_PurchasedById",
                        column: x => x.PurchasedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CreditTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: true),
                    TransactionType = table.Column<string>(type: "text", nullable: false),
                    Credits = table.Column<int>(type: "integer", nullable: false),
                    BalanceBefore = table.Column<int>(type: "integer", nullable: false),
                    BalanceAfter = table.Column<int>(type: "integer", nullable: false),
                    ReferenceType = table.Column<string>(type: "text", nullable: true),
                    ReferenceId = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditTransactions_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CreditTransactions_Recruiters_RecruiterId",
                        column: x => x.RecruiterId,
                        principalTable: "Recruiters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CreditTransactions_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InstitutionCreditWallets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AvailableCredits = table.Column<int>(type: "integer", nullable: false),
                    TotalPurchasedCredits = table.Column<int>(type: "integer", nullable: false),
                    TotalAllocatedCredits = table.Column<int>(type: "integer", nullable: false),
                    TotalConsumedCredits = table.Column<int>(type: "integer", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstitutionCreditWallets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstitutionCreditWallets_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SchoolAdminProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolAdminProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolAdminProfiles_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SchoolAdminProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CreditPriceConfigurations_CreatedById",
                table: "CreditPriceConfigurations",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_CreditPurchases_InstitutionId",
                table: "CreditPurchases",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditPurchases_PurchasedById",
                table: "CreditPurchases",
                column: "PurchasedById");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactions_CreatedByUserId",
                table: "CreditTransactions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactions_InstitutionId",
                table: "CreditTransactions",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactions_RecruiterId",
                table: "CreditTransactions",
                column: "RecruiterId");

            migrationBuilder.CreateIndex(
                name: "IX_InstitutionCreditWallets_InstitutionId",
                table: "InstitutionCreditWallets",
                column: "InstitutionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchoolAdminProfiles_InstitutionId",
                table: "SchoolAdminProfiles",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolAdminProfiles_UserId",
                table: "SchoolAdminProfiles",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CreditPriceConfigurations");

            migrationBuilder.DropTable(
                name: "CreditPurchases");

            migrationBuilder.DropTable(
                name: "CreditTransactions");

            migrationBuilder.DropTable(
                name: "InstitutionCreditWallets");

            migrationBuilder.DropTable(
                name: "SchoolAdminProfiles");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "PINCode",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Institutions");

            migrationBuilder.CreateTable(
                name: "RecruiterCreditTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: false),
                    BalanceAfter = table.Column<int>(type: "integer", nullable: false),
                    BalanceBefore = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Credits = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ReferenceId = table.Column<string>(type: "text", nullable: true),
                    TransactionType = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecruiterCreditTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecruiterCreditTransactions_Recruiters_RecruiterId",
                        column: x => x.RecruiterId,
                        principalTable: "Recruiters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecruiterCreditTransactions_RecruiterId",
                table: "RecruiterCreditTransactions",
                column: "RecruiterId");
        }
    }
}
