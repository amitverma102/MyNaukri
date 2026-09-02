import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../authentication/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recruiterApi } from '../api/recruiterApi';
import { Job, JobApplication } from '../api/candidateApi';

export const RecruiterHomeScreen = () => {
  const { userInfo, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [activeJobs, setActiveJobs] = useState(0);
  const [closedJobs, setClosedJobs] = useState(0);
  const [interviews, setInterviews] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const jobs = await recruiterApi.getMyJobs();
      const active = jobs.filter(j => j.isActive).length;
      const closed = jobs.length - active;
      
      const interviewApps = await recruiterApi.getInterviews();
      
      setActiveJobs(active);
      setClosedJobs(closed);
      setInterviews(interviewApps.length);
    } catch (error) {
      console.error('Failed to fetch recruiter stats', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Recruiter Dashboard</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subGreeting}>Welcome {userInfo?.firstName}</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{activeJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{closedJobs}</Text>
              <Text style={styles.statLabel}>Closed Jobs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{interviews}</Text>
              <Text style={styles.statLabel}>Interviews Scheduled</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>100</Text>
              <Text style={styles.statLabel}>Credits Available</Text>
            </View>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#53c5ab',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});
