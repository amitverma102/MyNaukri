using System;
using Npgsql;

class Program
{
    static void Main()
    {
        string connStr = "Host=localhost;Database=mynaukri_db;Username=postgres;Password=postgres123";
        using var conn = new NpgsqlConnection(connStr);
        conn.Open();

        using var cmd = new NpgsqlCommand(@"
            INSERT INTO ""RecruiterCreditRates"" 
            (""Id"", ""RecruiterId"", ""ResumeDownloadRate"", ""ContactViewRate"", ""BulkProfileDownloadRate"", ""NormalJobPostingRate"", ""PlatinumJobPostingRate"", ""CandidateEmailRate"", ""CreatedAt"", ""UpdatedAt"")
            SELECT gen_random_uuid(), ""Id"", 5, 2, 2, 20, 40, 3, NOW(), NOW()
            FROM ""Recruiters""
            WHERE ""Id"" NOT IN (SELECT ""RecruiterId"" FROM ""RecruiterCreditRates"");
        ", conn);
        int rows = cmd.ExecuteNonQuery();
        Console.WriteLine($"Inserted {rows} missing recruiter credit rate records.");
    }
}
