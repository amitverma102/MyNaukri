using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyNaukri.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameSchoolAdminToInstituteAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SchoolAdminProfiles");

            migrationBuilder.CreateTable(
                name: "InstituteAdminProfiles",
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
                    table.PrimaryKey("PK_InstituteAdminProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstituteAdminProfiles_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InstituteAdminProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InstituteAdminProfiles_InstitutionId",
                table: "InstituteAdminProfiles",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_InstituteAdminProfiles_UserId",
                table: "InstituteAdminProfiles",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InstituteAdminProfiles");

            migrationBuilder.CreateTable(
                name: "SchoolAdminProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
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
                name: "IX_SchoolAdminProfiles_InstitutionId",
                table: "SchoolAdminProfiles",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolAdminProfiles_UserId",
                table: "SchoolAdminProfiles",
                column: "UserId");
        }
    }
}
