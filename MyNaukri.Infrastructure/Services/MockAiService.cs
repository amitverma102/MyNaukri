using MyNaukri.Application.DTOs.Jobs;
using MyNaukri.Application.Interfaces;
using MyNaukri.Domain.Enums;
using MyNaukri.Application.DTOs.Candidates;
using MyNaukri.Application.DTOs.Ai;

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

    public Task<EduBotChatResponseDto> ChatWithEduBotAsync(EduBotChatRequestDto request)
    {
        var msg = (request?.Message ?? "").Trim();
        var lower = msg.ToLowerInvariant();

        // Check off-topic guardrail
        var offTopicKeywords = new[] { "recipe", "pizza", "cook", "cricket", "ipl", "football", "bitcoin", "crypto", "movie", "celebrity", "politics", "election", "weather", "horoscope" };
        if (offTopicKeywords.Any(k => lower.Contains(k)))
        {
            return Task.FromResult(new EduBotChatResponseDto
            {
                Response = "I am **EduBot**, your specialized EduTech & Career Assistant on Edukey360! 🎓\n\nI am designed specifically to assist with education careers, teaching opportunities, school & college hiring, and educational skills upgradation. I am unable to answer queries about non-educational topics.\n\nHow can I assist you with your academic career, teaching roles, or recruitment needs today?",
                IsOffTopic = true,
                ActionType = "guardrail_denial",
                SuggestedPrompts = new List<string>
                {
                    "Explore PGT & TGT Teaching Jobs",
                    "Instructional Designer Career Path",
                    "CTET & B.Ed Preparation Tips",
                    "How Recruiters Find Educators on Edukey360"
                }
            });
        }

        // Job search intent
        if (lower.Contains("job") || lower.Contains("opening") || lower.Contains("vacancy") || lower.Contains("math") || lower.Contains("teacher") || lower.Contains("faculty") || lower.Contains("hire"))
        {
            var mockJobs = new List<JobDto>
            {
                new JobDto
                {
                    Id = Guid.NewGuid(),
                    Title = "Senior PGT Mathematics Teacher",
                    CompanyName = "Delhi Public International School",
                    Location = "Delhi NCR",
                    MinSalary = 600000,
                    MaxSalary = 900000,
                    BoardAffiliation = "CBSE",
                    SubjectDepartment = "Mathematics",
                    WorkMode = "OnSite",
                    JobType = JobType.FullTime,
                    CreatedAt = DateTime.UtcNow
                },
                new JobDto
                {
                    Id = Guid.NewGuid(),
                    Title = "Curriculum & Instructional Designer",
                    CompanyName = "EduKey Learning Systems",
                    Location = "Bengaluru (Hybrid)",
                    MinSalary = 750000,
                    MaxSalary = 1200000,
                    BoardAffiliation = "CBSE & ICSE",
                    SubjectDepartment = "Instructional Design",
                    WorkMode = "Hybrid",
                    JobType = JobType.FullTime,
                    CreatedAt = DateTime.UtcNow
                }
            };

            return Task.FromResult(new EduBotChatResponseDto
            {
                Response = "Here are matching teaching and EduTech opportunities currently open on **Edukey360**! 🚀\n\n- **Senior PGT Mathematics Teacher** at Delhi Public International School (CBSE, Delhi NCR, ₹6 - 9 LPA)\n- **Curriculum & Instructional Designer** at EduKey Learning Systems (Hybrid, Bengaluru, ₹7.5 - 12 LPA)\n\nYou can click on any position below to view complete details, requirements, and apply directly.",
                IsOffTopic = false,
                ActionType = "job_search",
                MatchingJobs = mockJobs,
                SuggestedPrompts = new List<string>
                {
                    "What skills are required for PGT roles?",
                    "Tips for classroom demo interviews",
                    "Remote EdTech opportunities"
                }
            });
        }

        // Skills / Certifications intent
        if (lower.Contains("ctet") || lower.Contains("b.ed") || lower.Contains("net") || lower.Contains("skill") || lower.Contains("certification") || lower.Contains("upgrade"))
        {
            return Task.FromResult(new EduBotChatResponseDto
            {
                Response = "### 📚 Key Skills & Certifications for High-Growth Teaching Careers\n\n1. **Essential Credentials**:\n   - **CTET / State TET**: Mandatory for CBSE/government school appointments (Paper 1 for PRT, Paper 2 for TGT).\n   - **B.Ed / M.Ed**: Foundational pedagogy certification required by CBSE, ICSE, and state boards.\n   - **UGC NET / CSIR NET**: Gateway for Assistant Professor & higher education faculty positions.\n\n2. **Modern EduTech & Digital Skills**:\n   - **Learning Management Systems (LMS)**: Familiarity with Canvas, Moodle, or Google Classroom.\n   - **Instructional Design Frameworks**: ADDIE model, Bloom's Revised Taxonomy, and backward curriculum design.\n   - **Interactive Tech**: Smartboards, GeoGebra, Kahoot, and AI-assisted lesson planning.\n\n3. **Classroom Excellence**:\n   - Demonstrating differentiated instruction for mixed-ability learners.\n   - Constructivist teaching and NEP 2020 competency-based learning outcomes.",
                IsOffTopic = false,
                ActionType = "skills_guide",
                SuggestedPrompts = new List<string>
                {
                    "How to prepare for CTET Paper 2?",
                    "Instructional design courses for teachers",
                    "Find teaching jobs matching my profile"
                }
            });
        }

        // Default career advice
        return Task.FromResult(new EduBotChatResponseDto
        {
            Response = "Hello! I am **EduBot**, your dedicated AI Career and Education Assistant on **Edukey360**! 🎓\n\nI can help you with:\n- 🎯 **Finding EduTech & Teaching Jobs** matching your subject, board, and location.\n- 📈 **Career Pathways** for Teachers, Instructional Designers, STEM Trainers, and Academic Counselors.\n- 💡 **Skills Upgradation** (CTET, B.Ed, LMS mastery, lesson planning, and demo interview tips).\n- 🏫 **Recruiter Guidance** for schools and institutes looking to source qualified educators.\n\nWhat would you like to explore today?",
            IsOffTopic = false,
            ActionType = "career_advice",
            SuggestedPrompts = new List<string>
            {
                "Find PGT / TGT Teaching Jobs",
                "How to transition into Instructional Design?",
                "Key certifications for CBSE schools",
                "How can recruiters search teacher profiles?"
            }
        });
    }
}

