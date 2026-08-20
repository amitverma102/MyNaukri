using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExpandedCandidateFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BoardsTaught",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Certifications",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ClassesTaught",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CurrentLocation",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentSalary",
                table: "Candidates",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Education",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedSalary",
                table: "Candidates",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NoticePeriod",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PreferredLocations",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BoardsTaught",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "Certifications",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ClassesTaught",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "CurrentLocation",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "CurrentSalary",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "Education",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ExpectedSalary",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "NoticePeriod",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "PreferredLocations",
                table: "Candidates");
        }
    }
}
