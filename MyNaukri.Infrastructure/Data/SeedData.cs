using Microsoft.EntityFrameworkCore;
using MyNaukri.Domain.Entities;
using MyNaukri.Domain.Enums;

namespace MyNaukri.Infrastructure.Data;

public static class SeedData
{
    public static async Task SeedJobsAsync(ApplicationDbContext context)
    {
        // Check if jobs are already seeded
        if (await context.Jobs.CountAsync() >= 100) return;

        var institution = await context.Institutions.FirstOrDefaultAsync(i => i.Name == "Global Education Trust");
        if (institution == null)
        {
            institution = new Institution
            {
                Name = "Global Education Trust",
                Description = "A premier network of schools.",
                Website = "www.globaleducation.com",
                Address = "New Delhi, India"
            };
            context.Institutions.Add(institution);
            await context.SaveChangesAsync();
        }

        var recruiter = await context.Recruiters.FirstOrDefaultAsync();
        if (recruiter == null)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@recruiter.com");
            if (user == null) 
            {
                user = new User
                {
                    FirstName = "Admin",
                    LastName = "Recruiter",
                    Email = "admin@recruiter.com",
                    PasswordHash = "hashedpassword",
                    Role = Role.Recruiter
                };
                context.Users.Add(user);
                await context.SaveChangesAsync();
            }

            recruiter = new Recruiter
            {
                UserId = user.Id,
                Designation = "Senior HR",
                InstitutionId = institution.Id
            };
            context.Recruiters.Add(recruiter);
            await context.SaveChangesAsync();
        }

        var random = new Random();
        var titles = new[] { "Mathematics Teacher", "Physics Teacher", "English Teacher", "Chemistry Teacher", "Primary School Teacher", "Computer Science Teacher", "History Teacher", "Physical Education Instructor", "Biology Teacher", "Economics Teacher" };
        var locations = new[] { "New Delhi, Delhi", "Mumbai, Maharashtra", "Bangalore, Karnataka", "Hyderabad, Telangana", "Chennai, Tamil Nadu", "Pune, Maharashtra", "Gurgaon, Haryana", "Noida, Uttar Pradesh" };
        var jobTypes = new[] { JobType.FullTime, JobType.PartTime, JobType.Contract };
        var keywords = new[] { "teaching", "education", "school", "faculty", "instructor" };

        var jobs = new List<Job>();
        for (int i = 0; i < 100; i++)
        {
            jobs.Add(new Job
            {
                Title = titles[random.Next(titles.Length)],
                Description = "We are looking for an experienced teacher to join our institution. The ideal candidate will have a passion for education and a commitment to student success.",
                Requirements = "Bachelor's degree in Education or related field. Minimum 2 years of teaching experience. Excellent communication skills.",
                MinSalary = random.Next(3, 6) * 100000,
                MaxSalary = random.Next(6, 12) * 100000,
                JobType = jobTypes[random.Next(jobTypes.Length)],
                Location = locations[random.Next(locations.Length)],
                Keywords = keywords[random.Next(keywords.Length)],
                InstitutionId = institution.Id,
                RecruiterId = recruiter.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-random.Next(0, 30))
            });
        }

        context.Jobs.AddRange(jobs);
        await context.SaveChangesAsync();
    }
}
