using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGapAnalysisEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BoardAffiliation",
                table: "Jobs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScreeningQuestionsJson",
                table: "Jobs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubjectDepartment",
                table: "Jobs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkMode",
                table: "Jobs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScreeningAnswersJson",
                table: "JobApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlockedInstitutions",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CtetDetails",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentInstitution",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DemoVideoUrl",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCtetQualified",
                table: "Candidates",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JoiningAvailability",
                table: "Candidates",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BoardAffiliation",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ScreeningQuestionsJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "SubjectDepartment",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "WorkMode",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ScreeningAnswersJson",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "BlockedInstitutions",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "CtetDetails",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "CurrentInstitution",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "DemoVideoUrl",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "IsCtetQualified",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "JoiningAvailability",
                table: "Candidates");
        }
    }
}
