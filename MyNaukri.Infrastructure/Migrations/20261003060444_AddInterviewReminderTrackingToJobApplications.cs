using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewReminderTrackingToJobApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "InterviewReminderSentAt",
                table: "JobApplications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsInterviewReminderSent",
                table: "JobApplications",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InterviewReminderSentAt",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "IsInterviewReminderSent",
                table: "JobApplications");
        }
    }
}
