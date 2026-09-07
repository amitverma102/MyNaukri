import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { candidateApi } from '../api/candidateApi';

export const CandidateSavedJobsScreen = () => {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedJobs = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await candidateApi.getSavedJobs();
      setSavedJobs(res);
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      Alert.alert('Error', 'Failed to load saved jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedJobs();
  };

  const handleUnsave = async (jobId: string) => {
    try {
      await candidateApi.toggleSaveJob(jobId);
      setSavedJobs(savedJobs.filter(sj => sj.jobId !== jobId));
      Alert.alert('Success', 'Job unsaved.');
    } catch (error) {
      console.error('Error unsaving job:', error);
      Alert.alert('Error', 'Failed to unsave job.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Jobs</Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 50 }} />
        ) : savedJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You have no saved jobs.</Text>
          </View>
        ) : (
          savedJobs.map(job => (
            <View key={job.id} style={styles.card}>
              <Text style={styles.jobTitle}>{job.jobTitle}</Text>
              <Text style={styles.schoolName}>{job.companyName}</Text>
              
              <TouchableOpacity style={styles.unsaveButton} onPress={() => handleUnsave(job.jobId)}>
                <Text style={styles.unsaveText}>Unsave Job</Text>
              </TouchableOpacity>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  jobTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  schoolName: { fontSize: 14, color: '#666', marginBottom: 12 },
  unsaveButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start' },
  unsaveText: { color: '#e74c3c', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888', fontStyle: 'italic' }
});
