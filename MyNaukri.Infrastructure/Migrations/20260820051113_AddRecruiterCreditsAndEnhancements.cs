using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRecruiterCreditsAndEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Credits",
                table: "Recruiters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsPlatinum",
                table: "Jobs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "DifferentlyAbled",
                table: "Candidates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ExServiceman",
                table: "Candidates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ExServicemanBranch",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CandidateContactAccesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditsCharged = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidateContactAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CandidateContactAccesses_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CandidateContactAccesses_Recruiters_RecruiterId",
                        column: x => x.RecruiterId,
                        principalTable: "Recruiters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobApplicationComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Comment = table.Column<string>(type: "text", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobApplicationComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobApplicationComments_JobApplications_JobApplicationId",
                        column: x => x.JobApplicationId,
                        principalTable: "JobApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobApplicationComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecruiterCreditRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResumeDownloadRate = table.Column<int>(type: "integer", nullable: true),
                    ContactViewRate = table.Column<int>(type: "integer", nullable: true),
                    BulkProfileDownloadRate = table.Column<int>(type: "integer", nullable: true),
                    NormalJobPostingRate = table.Column<int>(type: "integer", nullable: true),
                    PlatinumJobPostingRate = table.Column<int>(type: "integer", nullable: true),
                    CandidateEmailRate = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecruiterCreditRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecruiterCreditRates_Recruiters_RecruiterId",
                        column: x => x.RecruiterId,
                        principalTable: "Recruiters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecruiterCreditTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionType = table.Column<string>(type: "text", nullable: false),
                    Credits = table.Column<int>(type: "integer", nullable: false),
                    BalanceBefore = table.Column<int>(type: "integer", nullable: false),
                    BalanceAfter = table.Column<int>(type: "integer", nullable: false),
                    ReferenceId = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
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
                name: "IX_CandidateContactAccesses_CandidateId",
                table: "CandidateContactAccesses",
                column: "CandidateId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateContactAccesses_RecruiterId_CandidateId",
                table: "CandidateContactAccesses",
                columns: new[] { "RecruiterId", "CandidateId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobApplicationComments_JobApplicationId",
                table: "JobApplicationComments",
                column: "JobApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_JobApplicationComments_UserId",
                table: "JobApplicationComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RecruiterCreditRates_RecruiterId",
                table: "RecruiterCreditRates",
                column: "RecruiterId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecruiterCreditTransactions_RecruiterId",
                table: "RecruiterCreditTransactions",
                column: "RecruiterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CandidateContactAccesses");

            migrationBuilder.DropTable(
                name: "JobApplicationComments");

            migrationBuilder.DropTable(
                name: "RecruiterCreditRates");

            migrationBuilder.DropTable(
                name: "RecruiterCreditTransactions");

            migrationBuilder.DropColumn(
                name: "Credits",
                table: "Recruiters");

            migrationBuilder.DropColumn(
                name: "IsPlatinum",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "DifferentlyAbled",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ExServiceman",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ExServicemanBranch",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Candidates");
        }
    }
}
