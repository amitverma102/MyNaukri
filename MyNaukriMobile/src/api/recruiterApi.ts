import { apiClient } from './apiClient';
import { Job, JobApplication } from './candidateApi';

export const recruiterApi = {
  getMyJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/Jobs/recruiter');
    return response.data;
  },

  closeJob: async (jobId: string): Promise<void> => {
    await apiClient.patch(`/Jobs/${jobId}/close`);
  },

  getJobApplications: async (jobId: string): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>(`/JobApplications/job/${jobId}`);
    return response.data;
  },

  getInterviews: async (): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>('/JobApplications/interviews');
    return response.data;
  },

  updateApplicationStatus: async (applicationId: string, status: number): Promise<void> => {
    await apiClient.patch(`/JobApplications/${applicationId}/status`, { status });
  },

  getCredits: async (): Promise<{ availableCredits: number }> => {
    const response = await apiClient.get<{ availableCredits: number }>('/recruiter/credits');
    return response.data;
  },

  searchCandidates: async (params: { keyword?: string; location?: string; minExperience?: number; noticePeriod?: string; isCtetQualified?: boolean; verifiedDemoOnly?: boolean; lastUpdatedDays?: number }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.location) query.append('location', params.location);
    if (params.minExperience !== undefined && !isNaN(params.minExperience)) query.append('minExperience', params.minExperience.toString());
    if (params.noticePeriod) query.append('noticePeriod', params.noticePeriod);
    if (params.isCtetQualified !== undefined) query.append('isCtetQualified', params.isCtetQualified.toString());
    if (params.verifiedDemoOnly) query.append('verifiedDemoOnly', 'true');
    if (params.lastUpdatedDays !== undefined) query.append('lastUpdatedDays', params.lastUpdatedDays.toString());
    const response = await apiClient.get<any[]>(`/candidates/search?${query.toString()}`);
    return response.data;
  },

  scheduleInterview: async (
    applicationId: string, 
    interviewDate: string, 
    interviewModeOrLink?: string,
    interviewLink?: string,
    interviewVenue?: string,
    interviewDetails?: string
  ): Promise<void> => {
    let mode: 'Online' | 'InPerson' | 'Telephonic' = 'Online';
    let link: string | undefined = undefined;

    if (interviewModeOrLink === 'Online' || interviewModeOrLink === 'InPerson' || interviewModeOrLink === 'Telephonic') {
      mode = interviewModeOrLink;
      link = interviewLink;
    } else {
      link = interviewModeOrLink;
    }

    await apiClient.post(`/JobApplications/${applicationId}/schedule-interview`, {
      interviewDate,
      interviewMode: mode,
      interviewLink: link,
      interviewVenue,
      interviewDetails
    });
  },

  unlockContact: async (candidateId: string): Promise<any> => {
    const response = await apiClient.post(`/candidates/${candidateId}/unlock-contact`);
    return response.data;
  },
};
