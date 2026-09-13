using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using MyNaukri.Application.DTOs.Candidates;

namespace MyNaukri.Infrastructure.Services;

public class MockAiService : IAiService
{
    public Task<ParsedResumeDto> ParseResumeAsync(byte[] resumeData, string fileName)
    {
        // Mock delay to simulate AI processing
        var mockResult = new MyNaukri.Application.DTOs.Candidates.ParsedResumeDto
        {
            Skills = "C#, .NET, React, SQL",
            TotalExperienceYears = 3,
            PhoneNumber = "9876543210",
            CurrentLocation = "Mock City",
            ClassesTaught = "10th, 12th",
            BoardsTaught = "CBSE",
            Education = "B.Tech in Computer Science",
            Certifications = "Microsoft Certified: Azure Developer Associate"
        };
        return Task.FromResult(mockResult);
    }

    public Task<IEnumerable<JobDto>> GetJobRecommendationsAsync(Guid candidateId)
    {
        // Mock recommended jobs based on AI candidate profile matching
        var recommendedJobs = new List<JobDto>
        {
            new JobDto
            {
                Id = Guid.NewGuid(),
                Title = "Senior AI Education Engineer (Mock Recommendation)",
                Description = "Looking for a C# / React expert to build AI portals.",
                Location = "Gurugram, HR",
                JobType = JobType.FullTime,
                MinSalary = 100000,
                MaxSalary = 150000,
                CreatedAt = DateTime.UtcNow
            },
            new JobDto
            {
                Id = Guid.NewGuid(),
                Title = "University Software Architect (Mock Recommendation)",
                Description = "Lead architecture for our education systems.",
                Location = "New Delhi, DL",
                JobType = JobType.FullTime,
                MinSalary = 120000,
                MaxSalary = 160000,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            }
        };

        return Task.FromResult<IEnumerable<JobDto>>(recommendedJobs);
    }

    public Task<JobResumeComparisonDto> CompareResumeWithJobAsync(Guid candidateId, Guid jobId)
    {
        var result = new JobResumeComparisonDto
        {
            JobId = jobId,
            JobTitle = "Senior Educator / Faculty",
            CompanyName = "Exemplar Academy",
            MatchScore = 85,
            FitLevel = "High",
            MatchSummary = "Strong alignment in core pedagogical background, subject expertise, and curriculum planning. Candidate fulfills essential prerequisites.",
            MatchedSkills = new List<string> { "Curriculum Design", "Classroom Management", "Pedagogy", "Assessment Planning" },
            MissingSkills = new List<string> { "Smartboard Systems", "Advanced Olympiad Coaching" },
            ExperienceMatch = new ExperienceMatchDto
            {
                Required = "3-5 years",
                Candidate = "4 years",
                IsMatch = true,
                Notes = "Candidate experience matches the required seniority bracket."
            },
            EducationMatch = new EducationMatchDto
            {
                Required = "Postgraduate Degree with B.Ed",
                Candidate = "M.Sc, B.Ed",
                IsMatch = true,
                Notes = "Holds mandatory educational credentials."
            },
            LocationMatch = new LocationMatchDto
            {
                JobLocation = "Delhi NCR",
                CandidateLocation = "Delhi NCR",
                IsMatch = true,
                Notes = "Located in preferred commuting zone."
            },
            Strengths = new List<string>
            {
                "Proven track record in board exam preparation.",
                "Demonstrated active student engagement techniques.",
                "Solid foundation in CBSE/ICSE curriculum alignment."
            },
            ImprovementSuggestions = new List<string>
            {
                "Incorporate measurable student outcome statistics (e.g. % distinction rate).",
                "Highlight familiarity with blended learning and edtech platforms."
            }
        };

        return Task.FromResult(result);
    }

    public Task<TailoredResumeDto> TailorResumeForJobAsync(Guid candidateId, Guid jobId)
    {
        var result = new TailoredResumeDto
        {
            JobId = jobId,
            JobTitle = "Senior Educator / Faculty",
            TailoredHeadline = "Dedicated Educator & Curriculum Specialist | 4+ Years Board Excellence",
            TailoredSummary = "Accomplished educator with 4+ years of specialized experience in delivering engaging, outcome-driven academic instruction. Proven track record of boosting student comprehension and board results through student-centric pedagogy, diagnostic assessments, and modern classroom tools.",
            TailoredBulletPoints = new List<string>
            {
                "Orchestrated interactive subject curriculum for 120+ senior students, yielding a 95% first-division rate in annual board exams.",
                "Designed and implemented diagnostic formative assessment frameworks that elevated remedial learners' scores by 22%.",
                "Integrated smart multimedia teaching aids to enhance analytical thinking and conceptual clarity in complex topics."
            },
            RecommendedSkillsToAdd = new List<string> { "Differentiated Instruction", "Diagnostic Assessments", "Curriculum Mapping", "Parent-Teacher Engagement" },
            CoverNotePitch = "Dear Hiring Committee,\n\nI am thrilled to apply for this opening. With a proven background in delivering rigorous curriculum standards and fostering an encouraging, high-achievement classroom environment, my qualifications and pedagogical approach strongly align with your institution's educational vision. I look forward to the opportunity to contribute to your students' ongoing success.\n\nSincerely,\nCandidate"
        };

        return Task.FromResult(result);
    }

    public Task<ParsedJobDescriptionDto> ParseJobDescriptionAsync(byte[] fileData, string fileName)
    {
        var mockResult = new ParsedJobDescriptionDto
        {
            Title = "Senior PGT Mathematics Teacher",
            Description = "We are seeking an enthusiastic Senior PGT Mathematics educator to lead senior secondary classes (11th & 12th) preparing for CBSE board examinations and competitive entrance tests.",
            Requirements = "Master's degree in Mathematics (M.Sc) with B.Ed. Minimum 4-7 years of teaching senior secondary classes in reputed CBSE/ICSE institutions. Strong conceptual clarity in Calculus, Algebra, and Vectors.",
            Location = "Delhi NCR",
            MinSalary = 600000,
            MaxSalary = 900000,
            JobType = "FullTime",
            WorkMode = "OnSite",
            BoardAffiliation = "CBSE",
            SubjectDepartment = "Mathematics",
            Keywords = "Mathematics, PGT, Calculus, CBSE, Senior Secondary, Algebra",
            MinExperienceYears = 4,
            MaxExperienceYears = 8,
            SuggestedScreeningQuestions = new List<string>
            {
                "Do you have experience teaching Class 12 CBSE Board Mathematics?",
                "Are you comfortable conducting remedial classes and Olympiad preparation?",
                "What is your earliest joining availability?"
            },
            RawTextPreview = "Parsed from " + fileName
        };

        return Task.FromResult(mockResult);
    }
}
