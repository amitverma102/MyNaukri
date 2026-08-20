# MyNaukri.com (Education Sector Job Portal)

MyNaukri is a modern, scalable, AI-powered web application inspired by Naukri.com but focused exclusively on the **Education Sector**. It connects schools, colleges, ed-tech companies, and coaching institutes with teaching and non-teaching candidates.

## Features

*   **Role-Based Access Control**: Secure authentication using JWT with specialized roles (Candidate, Recruiter, School Administrator, System Admin).
*   **AI-Powered Features (MVP)**: Automated resume parsing and job recommendations (Architected with Mock services, ready for OpenAI/Gemini integration).
*   **Advanced Search (MVP)**: Semantic and keyword search for job postings (Architected with Mock services).
*   **Scalable Architecture**: Built using Clean Architecture and Domain-Driven Design (DDD).
*   **Cloud Ready**: Full Dockerization for both frontend and backend, with a robust `docker-compose.yml` for local development.

## Tech Stack

### Backend
*   **Framework**: .NET 10 (ASP.NET Core Web API)
*   **Architecture**: Clean Architecture, DDD, CQRS (MediatR), Repository Pattern
*   **Database**: PostgreSQL 15 (Entity Framework Core)
*   **Security**: JWT Authentication, BCrypt Password Hashing, AES-256 for PII

### Frontend
*   **Framework**: React 18, TypeScript, Vite
*   **Styling**: Material UI (MUI) v5
*   **State Management / Fetching**: React Query (TanStack), Axios
*   **Forms**: Formik, Yup Validation

### DevOps
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions

## Project Structure

*   `MyNaukri.Domain`: Enterprise business rules, entities, and enums.
*   `MyNaukri.Application`: Application business rules, DTOs, Interfaces, MediatR Handlers.
*   `MyNaukri.Infrastructure`: External concerns, Database context, Repositories, Third-party service implementations.
*   `MyNaukri.API`: REST endpoints, Controllers, Dependency Injection setup.
*   `MyNaukri.SharedKernel`: Shared utilities across projects.
*   `ClientApp`: The React + Vite frontend application.

## Getting Started

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.
*   [Node.js](https://nodejs.org/) v20+ (if running the frontend locally without Docker).
*   [.NET 10 SDK](https://dotnet.microsoft.com/) (if running the backend locally without Docker).

### Running with Docker Compose (Recommended)

1. Clone the repository and navigate to the root directory.
2. Run the following command:
   ```bash
   docker compose up --build
   ```
3. The services will be available at:
   *   **Frontend App**: `http://localhost:3000`
   *   **Backend API**: `http://localhost:8080` (Swagger UI is at `http://localhost:8080/swagger`)
   *   **PostgreSQL**: `localhost:5432`

### Running Locally (Without Docker)

1. **Start the Database**:
   ```bash
   docker compose up db -d
   ```
2. **Start the Backend API**:
   ```bash
   dotnet run --project MyNaukri.API/MyNaukri.API.csproj
   ```
3. **Start the Frontend App**:
   ```bash
   cd ClientApp
   npm install
   npm run dev
   ```

## Next Steps / Future Enhancements

*   **Azure Integration**: Swap the MVP `MockStorageService` and `MockSearchService` with actual Azure Blob Storage and Azure Cognitive Search implementations.
*   **AI Integration**: Swap the `MockAiService` with a real LLM provider (OpenAI, Gemini) for accurate resume parsing and recommendation engines.
*   **Email Notifications**: Integrate SendGrid or AWS SES into `INotificationService`.
