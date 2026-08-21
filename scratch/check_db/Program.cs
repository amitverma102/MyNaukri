using System;
using Npgsql;

class Program
{
    static void Main()
    {
        string connStr = "Host=localhost;Database=mynaukri_db;Username=postgres;Password=postgres123";
        using var conn = new NpgsqlConnection(connStr);
        conn.Open();

        using var cmd = new NpgsqlCommand("SELECT r.\"Id\", u.\"Email\", r.\"Credits\" FROM \"Recruiters\" r JOIN \"Users\" u ON r.\"UserId\" = u.\"Id\" WHERE u.\"Email\" = 'recav1@edu.net';", conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            Console.WriteLine($"RecruiterId: {reader[0]}, Email: {reader[1]}, Credits: {reader[2]}");
        }
    }
}
