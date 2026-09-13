using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDemoVideoVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DemoVideoRejectionReason",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DemoVideoStatus",
                table: "Candidates",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DemoVideoSubject",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DemoVideoSummary",
                table: "Candidates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DemoVideoVerifiedAt",
                table: "Candidates",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DemoVideoRejectionReason",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "DemoVideoStatus",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "DemoVideoSubject",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "DemoVideoSummary",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "DemoVideoVerifiedAt",
                table: "Candidates");
        }
    }
}
