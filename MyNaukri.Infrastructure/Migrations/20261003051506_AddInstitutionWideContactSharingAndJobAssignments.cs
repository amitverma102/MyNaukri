using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInstitutionWideContactSharingAndJobAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRestrictedAccess",
                table: "Jobs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "InstitutionId",
                table: "CandidateContactAccesses",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "JobRecruiterAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecruiterId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobRecruiterAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobRecruiterAssignments_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobRecruiterAssignments_Recruiters_RecruiterId",
                        column: x => x.RecruiterId,
                        principalTable: "Recruiters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CandidateContactAccesses_InstitutionId_CandidateId",
                table: "CandidateContactAccesses",
                columns: new[] { "InstitutionId", "CandidateId" });

            migrationBuilder.CreateIndex(
                name: "IX_JobRecruiterAssignments_JobId_RecruiterId",
                table: "JobRecruiterAssignments",
                columns: new[] { "JobId", "RecruiterId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobRecruiterAssignments_RecruiterId",
                table: "JobRecruiterAssignments",
                column: "RecruiterId");

            migrationBuilder.AddForeignKey(
                name: "FK_CandidateContactAccesses_Institutions_InstitutionId",
                table: "CandidateContactAccesses",
                column: "InstitutionId",
                principalTable: "Institutions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CandidateContactAccesses_Institutions_InstitutionId",
                table: "CandidateContactAccesses");

            migrationBuilder.DropTable(
                name: "JobRecruiterAssignments");

            migrationBuilder.DropIndex(
                name: "IX_CandidateContactAccesses_InstitutionId_CandidateId",
                table: "CandidateContactAccesses");

            migrationBuilder.DropColumn(
                name: "IsRestrictedAccess",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "InstitutionId",
                table: "CandidateContactAccesses");
        }
    }
}
