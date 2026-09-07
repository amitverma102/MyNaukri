using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MyNaukri.Infrastructure.Data;
using MyNaukri.Domain.Entities;
using Microsoft.Extensions.Configuration;

class Program
{
    static void Main()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("/Users/Source Code/MyNaukri/MyNaukri.API/appsettings.Development.json")
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));

        using var context = new ApplicationDbContext(optionsBuilder.Options);

        var candidate = context.Candidates
            .Include(c => c.User)
            .FirstOrDefault(c => c.User.Email == "amitverma102@gmail.com" || c.User.Email == "amitverma102@outlook.com");

        if (candidate != null)
        {
            Console.WriteLine($"Email: {candidate.User.Email}");
            Console.WriteLine($"IsSubscribedToJobAlerts: {candidate.IsSubscribedToJobAlerts}");
            Console.WriteLine($"Skills: {candidate.Skills}");
        }
        else
        {
            Console.WriteLine("Candidate not found.");
        }
    }
}
