import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { candidateApi, JobApplication } from '../api/candidateApi';

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
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>All Applications</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, tab === 'interviews' && styles.tabButtonActive]}
          onPress={() => setTab('interviews')}
        >
          <Text style={[styles.tabText, tab === 'interviews' && styles.tabTextActive]}>Interviews</Text>
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
          currentData.map(app => (
            <View key={app.id} style={styles.card}>
              <Text style={styles.jobTitle}>{app.jobTitle}</Text>
              <Text style={styles.status}>Status: {app.status}</Text>
              
              {app.interviewDate && (
                <Text style={styles.interviewInfo}>
                  Date: {new Date(app.interviewDate).toLocaleString()}
                </Text>
              )}
              {app.interviewLink && (
                <TouchableOpacity onPress={() => Linking.openURL(app.interviewLink!)}>
                  <Text style={styles.linkText}>Join Interview</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: '#53c5ab' },
  tabText: { fontSize: 16, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#53c5ab', fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  jobTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  status: { fontSize: 14, color: '#555', marginBottom: 8 },
  interviewInfo: { fontSize: 14, color: '#333', marginTop: 4, fontWeight: '500' },
  linkText: { color: '#53c5ab', fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888', fontStyle: 'italic' }
});
