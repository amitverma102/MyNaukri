import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, Modal, TextInput, Linking, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recruiterApi } from '../api/recruiterApi';
import { Job, JobApplication } from '../api/candidateApi';
import { API_BASE_URL } from '../api/apiClient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export const RecruiterJobsScreen = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Schedule Interview State
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleAppId, setScheduleAppId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const fetchedJobs = await recruiterApi.getMyJobs();
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Failed to fetch recruiter jobs', error);
      Alert.alert('Error', 'Failed to load your jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleCloseJob = async (jobId: string) => {
    Alert.alert(
      'Close Job',
      'Are you sure you want to close this job listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await recruiterApi.closeJob(jobId);
              Alert.alert('Success', 'Job closed successfully');
              fetchJobs();
            } catch (error) {
              Alert.alert('Error', 'Failed to close job.');
            }
          },
        },
      ]
    );
  };

  const openApplications = async (job: Job) => {
    setSelectedJob(job);
    setModalVisible(true);
    setLoadingApps(true);
    try {
      const apps = await recruiterApi.getJobApplications(job.id);
      setApplications(apps);
    } catch (error) {
      Alert.alert('Error', 'Failed to load applications.');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, status: number) => {
    try {
      await recruiterApi.updateApplicationStatus(applicationId, status);
      Alert.alert('Success', 'Candidate status updated.');
      if (selectedJob) openApplications(selectedJob);
    } catch (error) {
      Alert.alert('Error', 'Failed to update application status.');
    }
  };

  const openScheduleModal = (appId: string) => {
    setScheduleAppId(appId);
    // Suggest next business day at 11:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    setInterviewDate(tomorrow.toISOString().substring(0, 16).replace('T', ' '));
    setInterviewLink('https://meet.google.com/');
    setScheduleModalVisible(true);
  };

  const submitScheduleInterview = async () => {
    if (!scheduleAppId || !interviewDate.trim()) {
      Alert.alert('Required', 'Please enter a valid interview date and time.');
      return;
    }

    setScheduling(true);
    try {
      await recruiterApi.scheduleInterview(scheduleAppId, interviewDate.trim(), interviewLink.trim());
      Alert.alert('Success', 'Interview scheduled and calendar invite sent to candidate!');
      setScheduleModalVisible(false);
      if (selectedJob) openApplications(selectedJob);
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule interview.');
    } finally {
      setScheduling(false);
    }
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <View style={[styles.jobCard, item.isPlatinum && styles.platinumCard]}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        {item.isPlatinum && <MaterialIcons name="stars" size={20} color="#FFD700" />}
      </View>
      <Text style={styles.statusText}>{item.isActive ? '🟢 Active Listing' : '🔴 Closed'}</Text>
      <Text style={styles.locationText}>📍 {item.location} • {item.jobType}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.viewAppsButton} onPress={() => openApplications(item)}>
          <Ionicons name="people" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.viewAppsText}>Applications</Text>
        </TouchableOpacity>
        
        {item.isActive && (
          <TouchableOpacity style={styles.closeButton} onPress={() => handleCloseJob(item.id)}>
            <Text style={styles.closeText}>Close Job</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderApplicationItem = ({ item }: { item: JobApplication }) => {
    let answers: Record<string, string> | null = null;
    if (item.screeningAnswersJson) {
      try {
        answers = JSON.parse(item.screeningAnswersJson);
      } catch (err) {
        // Ignored
      }
    }

    const resumeFullUrl = item.candidateResumeUrl 
      ? (item.candidateResumeUrl.startsWith('http') ? item.candidateResumeUrl : `${API_BASE_URL.replace('/api', '')}${item.candidateResumeUrl}`)
      : null;

    return (
      <View style={styles.appCard}>
        <View style={styles.appHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>
              {item.candidateName || `Candidate #${item.candidateId?.substring(0, 8)}`}
            </Text>
            {item.candidateEmail ? (
              <Text style={styles.appContact}>✉️ {item.candidateEmail}</Text>
            ) : null}
            {item.candidatePhoneNumber ? (
              <Text style={styles.appContact}>📞 {item.candidatePhoneNumber}</Text>
            ) : null}
          </View>
          <View style={styles.badgeColumn}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{item.status}</Text>
            </View>
            {item.aiMatchScore !== undefined && (
              <Text style={styles.appMatch}>AI Match: {item.aiMatchScore}%</Text>
            )}
          </View>
        </View>

        {/* Screening Answers preview */}
        {answers && Object.keys(answers).length > 0 && (
          <View style={styles.screeningBox}>
            <Text style={styles.screeningTitle}>Screening Answers:</Text>
            {Object.entries(answers).map(([q, a], idx) => (
              <Text key={idx} style={styles.screeningText}>
                • <Text style={{ fontWeight: '600' }}>{q}:</Text> {a}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.appActionsRow}>
          {resumeFullUrl && (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() => Linking.openURL(resumeFullUrl)}
            >
              <MaterialIcons name="description" size={15} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={styles.resumeButtonText}>Resume</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.shortlistButton}
            onPress={() => handleStatusUpdate(item.id, 1)}
          >
            <Ionicons name="checkmark-circle" size={15} color="#15803d" style={{ marginRight: 4 }} />
            <Text style={styles.shortlistText}>Shortlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => openScheduleModal(item.id)}
          >
            <MaterialIcons name="event" size={15} color="#7c3aed" style={{ marginRight: 4 }} />
            <Text style={styles.scheduleText}>Interview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleStatusUpdate(item.id, 2)}
          >
            <Ionicons name="close-circle" size={15} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Postings</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#53c5ab" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>You haven't posted any jobs yet.</Text>
            </View>
          }
        />
      )}

      {/* Applications Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>Applicants for {selectedJob?.title}</Text>
              <Text style={styles.modalSubtitle}>{applications.length} candidates applied</Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 6 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {loadingApps ? (
            <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={applications}
              keyExtractor={(item) => item.id}
              renderItem={renderApplicationItem}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={<Text style={styles.emptyText}>No applications yet.</Text>}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal visible={scheduleModalVisible} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Schedule Candidate Interview</Text>
            <Text style={styles.dialogSubtitle}>Pick date, time, and meeting link:</Text>

            <Text style={styles.inputLabel}>Date & Time (YYYY-MM-DD HH:mm)</Text>
            <TextInput
              style={styles.dialogInput}
              value={interviewDate}
              onChangeText={setInterviewDate}
              placeholder="e.g. 2026-09-15 11:00"
            />

            <Text style={styles.inputLabel}>Meeting URL / Venue Link</Text>
            <TextInput
              style={styles.dialogInput}
              value={interviewLink}
              onChangeText={setInterviewLink}
              placeholder="https://meet.google.com/..."
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => setScheduleModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogSubmit}
                onPress={submitScheduleInterview}
                disabled={scheduling}
              >
                {scheduling ? <ActivityIndicator color="#fff" /> : <Text style={styles.dialogSubmitText}>Schedule</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  listContainer: { padding: 16, paddingBottom: 30 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  platinumCard: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  jobTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  statusText: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  locationText: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  viewAppsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#53c5ab',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewAppsText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  closeText: { color: '#64748b', fontSize: 13, fontWeight: '600' },

  // Applications Review
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  appCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  appName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  appContact: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badgeColumn: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  appMatch: { fontSize: 12, fontWeight: '700', color: '#0d9488' },
  screeningBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  screeningTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  screeningText: { fontSize: 12, color: '#334155', lineHeight: 18 },
  appActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  resumeButtonText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  shortlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  shortlistText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  scheduleText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  rejectButton: {
    backgroundColor: '#fee2e2',
    padding: 6,
    borderRadius: 6,
  },

  // Schedule Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  dialogSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  dialogCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  dialogCancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  dialogSubmit: { backgroundColor: '#53c5ab', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6 },
  dialogSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
