import { apiClient } from './apiClient';

export interface UploadResumeResponse {
  skills: string;
  phoneNumber: string;
  totalExperienceYears: number;
  currentLocation: string;
  classesTaught: string;
  boardsTaught: string;
  education: string;
  certifications: string;
  resumeUrl: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  minSalary: number;
  maxSalary: number;
  jobType: string;
  location: string;
  companyName: string;
  isActive: boolean;
  isPlatinum: boolean;
  isApplied?: boolean;
  createdAt: string;
  workMode?: string;
  boardAffiliation?: string;
  subjectDepartment?: string;
  screeningQuestionsJson?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhoneNumber?: string;
  candidateResumeUrl?: string;
  screeningAnswersJson?: string;
  status: string | number;
  aiMatchScore?: number;
  aiFeedback?: string;
  interviewDate?: string;
  interviewLink?: string;
}

export const candidateApi = {
  uploadResume: async (uri: string, name: string, mimeType: string): Promise<UploadResumeResponse> => {
    const formData = new FormData();
    // React Native's fetch/axios FormData implementation requires this specific shape for files
    formData.append('file', {
      uri,
      name,
      type: mimeType,
    } as any);

    const response = await apiClient.post<UploadResumeResponse>('/Candidates/parse-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  getAllJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/Jobs');
    return response.data;
  },

  getRecommendedJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/Jobs/recommendations');
    return response.data;
  },

  searchJobs: async (query: string): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>(`/Jobs/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  applyToJob: async (jobId: string, screeningAnswersJson?: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/JobApplications/apply/${jobId}`, { screeningAnswersJson });
    return response.data;
  },

  getMyApplications: async (): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>('/JobApplications/candidate');
    return response.data;
  },
  
  getProfile: async (): Promise<any> => {
    const response = await apiClient.get('/Candidates/profile');
    return response.data;
  },

  getSavedJobs: async (): Promise<any[]> => {
    const response = await apiClient.get('/SavedJobs');
    return response.data;
  },

  toggleSaveJob: async (jobId: string): Promise<any> => {
    const response = await apiClient.post(`/SavedJobs/${jobId}`);
    return response.data;
  },

  getInterviews: async (): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>('/JobApplications/candidate/interviews');
    return response.data;
  },

  reverifyDemoVideo: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/Candidates/verify-demo-video');
    return response.data;
  },

  getJobAiMatch: async (jobId: string): Promise<any> => {
    const response = await apiClient.get(`/Jobs/${jobId}/ai-match`);
    return response.data;
  },

  getTailoredResume: async (jobId: string): Promise<any> => {
    const response = await apiClient.post(`/Jobs/${jobId}/ai-tailor-resume`);
    return response.data;
  },

  saveTailoredSummary: async (summary: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/Candidates/profile/save-tailored-summary', { summary });
    return response.data;
  }
};
