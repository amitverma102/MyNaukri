import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recruiterApi } from '../api/recruiterApi';
import { Job, JobApplication } from '../api/candidateApi';
import { MaterialIcons } from '@expo/vector-icons';

export const RecruiterJobsScreen = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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

  const renderJobCard = ({ item }: { item: Job }) => (
    <View style={[styles.jobCard, item.isPlatinum && styles.platinumCard]}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        {item.isPlatinum && <MaterialIcons name="stars" size={20} color="#FFD700" />}
      </View>
      <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Closed'}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.viewAppsButton} onPress={() => openApplications(item)}>
          <Text style={styles.viewAppsText}>View Applications</Text>
        </TouchableOpacity>
        
        {item.isActive && (
          <TouchableOpacity style={styles.closeButton} onPress={() => handleCloseJob(item.id)}>
            <Text style={styles.closeText}>Close Job</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderApplicationItem = ({ item }: { item: JobApplication }) => (
    <View style={styles.appCard}>
      <Text style={styles.appName}>Candidate ID: {item.candidateId}</Text>
      <Text style={styles.appStatus}>Status: {item.status}</Text>
      {item.aiMatchScore !== undefined && (
        <Text style={styles.appMatch}>AI Match: {item.aiMatchScore}%</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Jobs</Text>
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
            <Text style={styles.modalTitle}>Applications for {selectedJob?.title}</Text>
            <Button title="Close" onPress={() => setModalVisible(false)} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  listContainer: { padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#53c5ab',
  },
  platinumCard: {
    borderLeftColor: '#FFD700',
    backgroundColor: '#fffcf0',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  statusText: { fontSize: 14, color: '#666', marginBottom: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  viewAppsButton: {
    backgroundColor: '#53c5ab',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  viewAppsText: { color: '#fff', fontWeight: 'bold' },
  closeButton: {
    borderWidth: 1,
    borderColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  closeText: { color: '#e74c3c', fontWeight: 'bold' },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#f0f2f5' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  
  appCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  appName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  appStatus: { fontSize: 14, color: '#53c5ab', marginBottom: 4 },
  appMatch: { fontSize: 14, color: '#27ae60', fontWeight: 'bold' },
});
