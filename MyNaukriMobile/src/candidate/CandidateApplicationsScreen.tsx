import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { candidateApi, JobApplication } from '../api/candidateApi';
import { API_BASE_URL } from '../api/apiClient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { formatDateTime } from '../utils/dateUtils';

const getStatusBadge = (status: string | number, interviewDate?: string | null) => {
  const s = status.toString().toLowerCase();
  if (s.includes('interview') || s === '3') {
    if (interviewDate && new Date(interviewDate) < new Date()) {
      return { bg: '#fef3c7', text: '#b45309', label: 'Interview Completed • Result Awaited' };
    }
    return { bg: '#fef3c7', text: '#d97706', label: 'Interview Scheduled' };
  }
  if (s.includes('shortlist') || s === '1') return { bg: '#ede9fe', text: '#7c3aed', label: 'Shortlisted' };
  if (s.includes('hire') || s.includes('select') || s === '4') return { bg: '#dcfce7', text: '#15803d', label: 'Selected' };
  if (s.includes('reject') || s === '2') return { bg: '#fee2e2', text: '#dc2626', label: 'Not Selected' };
  return { bg: '#e0f2fe', text: '#0284c7', label: 'Applied' };
};

export const CandidateApplicationsScreen = () => {
  const [tab, setTab] = useState<'all' | 'interviews'>('all');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [interviews, setInterviews] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [appsRes, intsRes] = await Promise.all([
        candidateApi.getMyApplications(),
        candidateApi.getInterviews()
      ]);
      
      setApplications(appsRes);
      setInterviews(intsRes);
    } catch (error) {
      console.error('Error fetching applications:', error);
      Alert.alert('Error', 'Failed to load applications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const handleDownloadCalendar = (appId: string) => {
    const calendarUrl = `${API_BASE_URL}/jobapplications/${appId}/interview.ics`;
    Linking.openURL(calendarUrl);
  };

  const currentData = tab === 'all' ? applications : interviews;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Applications</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, tab === 'all' && styles.tabButtonActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>All Applications ({applications.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, tab === 'interviews' && styles.tabButtonActive]}
          onPress={() => setTab('interviews')}
        >
          <Text style={[styles.tabText, tab === 'interviews' && styles.tabTextActive]}>Interviews ({interviews.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 50 }} />
        ) : currentData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {tab === 'all' ? 'You have not applied to any jobs yet.' : 'No interview invites yet.'}
            </Text>
          </View>
        ) : (
          currentData.map(app => {
            const badge = getStatusBadge(app.status, app.interviewDate);
            return (
              <View key={app.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.jobTitle}>{app.jobTitle}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                
                {app.interviewDate && (
                  <View style={styles.interviewContainer}>
                    <View style={styles.interviewRow}>
                      <MaterialIcons name="event" size={16} color="#d97706" />
                      <Text style={styles.interviewInfo}>
                        {formatDateTime(app.interviewDate)}
                      </Text>
                    </View>

                    <View style={styles.actionButtonsRow}>
                      {app.interviewLink && (
                        <TouchableOpacity
                          style={styles.joinButton}
                          onPress={() => Linking.openURL(app.interviewLink!)}
                        >
                          <Ionicons name="videocam" size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.joinButtonText}>Join Call</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.calendarButton}
                        onPress={() => handleDownloadCalendar(app.id)}
                      >
                        <MaterialIcons name="calendar-today" size={15} color="#0d9488" style={{ marginRight: 4 }} />
                        <Text style={styles.calendarButtonText}>Add to Calendar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: '#53c5ab' },
  tabText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#0d9488', fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', flex: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  interviewContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  interviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  interviewInfo: { fontSize: 14, color: '#92400e', fontWeight: '600', marginLeft: 6 },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  joinButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  calendarButtonText: { color: '#0f766e', fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});
