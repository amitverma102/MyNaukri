import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../authentication/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { candidateApi, Job, JobApplication } from '../api/candidateApi';
import { Ionicons } from '@expo/vector-icons';

export const CandidateHomeScreen = () => {
  const { userInfo, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp<any>>();
  
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [jobsRes, appsRes] = await Promise.all([
        candidateApi.getRecommendedJobs(),
        candidateApi.getMyApplications()
      ]);
      
      setRecommendedJobs(jobsRes);
      setApplications(appsRes);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const activeApplicationsCount = applications.filter(a => a.status !== 'Rejected' && a.status !== 'Hired').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello {userInfo?.firstName || 'Candidate'}</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={16} color="#dc2626" style={{ marginRight: 4 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Jobs</Text>
              
              {recommendedJobs.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>No recommendations right now. Ensure your resume is uploaded and profile is complete.</Text>
                </View>
              ) : (
                recommendedJobs.slice(0, 3).map(job => (
                  <View key={job.id} style={styles.card}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.schoolName}>{job.companyName}</Text>
                    <TouchableOpacity style={styles.viewJobButton} onPress={() => navigation.navigate('Jobs')}>
                      <Text style={styles.viewJobText}>View Job</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Applications & Interviews</Text>
              </View>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Applications')}>
                <Text style={styles.statText}>{activeApplicationsCount} Active Applications</Text>
                {applications.length > 0 && (
                  <Text style={styles.subText}>Latest: {applications[0].jobTitle} ({applications[0].status})</Text>
                )}
                <Text style={styles.viewMoreText}>View All Applications & Interviews &rarr;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Saved Jobs</Text>
              </View>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SavedJobs')}>
                <Text style={styles.statText}>View your saved jobs</Text>
                <Text style={styles.viewMoreText}>Go to Saved Jobs &rarr;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Completion</Text>
              <View style={styles.card}>
                <Text style={styles.statText}>85%</Text>
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Complete Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 48,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  schoolName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  viewJobButton: {
    borderWidth: 1,
    borderColor: '#53c5ab',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  viewJobText: {
    color: '#53c5ab',
    fontWeight: '500',
  },
  statText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#53c5ab',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  viewMoreText: {
    marginTop: 8,
    color: '#53c5ab',
    fontWeight: '500',
    fontSize: 14,
  },
});
