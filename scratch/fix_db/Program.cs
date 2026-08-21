using System;
using Npgsql;

class Program
{
    static void Main()
    {
        string connStr = "Host=localhost;Database=mynaukri_db;Username=postgres;Password=postgres123";
        using var conn = new NpgsqlConnection(connStr);
        conn.Open();

        using var cmd1 = new NpgsqlCommand("UPDATE \"CandidateContactAccesses\" SET \"HasUnlockedContact\" = true;", conn);
        int rows1 = cmd1.ExecuteNonQuery();
        Console.WriteLine($"Updated {rows1} rows to HasUnlockedContact = true");
    }
}
