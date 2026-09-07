import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../authentication/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recruiterApi } from '../api/recruiterApi';
import { Ionicons } from '@expo/vector-icons';

export const RecruiterHomeScreen = () => {
  const { userInfo, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [activeJobs, setActiveJobs] = useState(0);
  const [closedJobs, setClosedJobs] = useState(0);
  const [interviews, setInterviews] = useState(0);
  const [credits, setCredits] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const [jobs, interviewApps, creditData] = await Promise.all([
        recruiterApi.getMyJobs().catch(() => []),
        recruiterApi.getInterviews().catch(() => []),
        recruiterApi.getCredits().catch(() => ({ availableCredits: 0 }))
      ]);
      
      const active = jobs.filter(j => j.isActive).length;
      const closed = jobs.length - active;
      
      setActiveJobs(active);
      setClosedJobs(closed);
      setInterviews(interviewApps.length);
      setCredits(creditData?.availableCredits ?? 0);
    } catch (error) {
      console.error('Failed to fetch recruiter stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Recruiter Dashboard</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={16} color="#dc2626" style={{ marginRight: 4 }} />
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
              <Text style={styles.statNumber}>{credits}</Text>
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
    paddingBottom: 40,
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
