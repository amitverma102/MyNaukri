using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewModeAndVenueDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InterviewDetails",
                table: "JobApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InterviewMode",
                table: "JobApplications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InterviewVenue",
                table: "JobApplications",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InterviewDetails",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "InterviewMode",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "InterviewVenue",
                table: "JobApplications");
        }
    }
}
