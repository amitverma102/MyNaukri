using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJobApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalComment",
                table: "Jobs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovalStatus",
                table: "Jobs",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Jobs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "Jobs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequireJobApproval",
                table: "Institutions",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_ApprovedByUserId",
                table: "Jobs",
                column: "ApprovedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Users_ApprovedByUserId",
                table: "Jobs",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Users_ApprovedByUserId",
                table: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_ApprovedByUserId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ApprovalComment",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "RequireJobApproval",
                table: "Institutions");
        }
    }
}
