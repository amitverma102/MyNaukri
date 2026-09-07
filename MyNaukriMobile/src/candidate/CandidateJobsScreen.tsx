import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { candidateApi, Job } from '../api/candidateApi';
import { MaterialIcons } from '@expo/vector-icons';

export const CandidateJobsScreen = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async (query: string = '') => {
    try {
      if (!refreshing) setLoading(true);
      
      const [fetchedJobs, applications] = await Promise.all([
        query.trim() === '' ? candidateApi.getAllJobs() : candidateApi.searchJobs(query),
        candidateApi.getMyApplications().catch(() => [])
      ]);

      const appliedSet = new Set<string>(applications.map((app: any) => app.jobId));
      
      // Also include any jobs marked isApplied from backend
      fetchedJobs.forEach((job: any) => {
        if (job.isApplied || job.IsApplied) {
          appliedSet.add(job.id);
        }
      });

      setAppliedJobIds(appliedSet);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
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
    fetchJobs(searchQuery);
  };

  const handleSearch = () => {
    fetchJobs(searchQuery);
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplyingJobId(jobId);
      await candidateApi.applyToJob(jobId);

      // Immediately mark as applied in local state
      setAppliedJobIds(prev => new Set(prev).add(jobId));
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, isApplied: true } : job
        )
      );

      Alert.alert('Success', 'Successfully applied to the job!');
    } catch (error: any) {
      console.error('Failed to apply', error);
      const errorMessage = error.response?.data || error.response?.data?.message || 'Failed to apply. You may have already applied.';
      
      // If error indicates already applied, update the button to Applied
      const errorStr = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
      if (errorStr.includes('already applied') || errorStr.includes('already exist')) {
        setAppliedJobIds(prev => new Set(prev).add(jobId));
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job.id === jobId ? { ...job, isApplied: true } : job
          )
        );
      }

      Alert.alert('Apply Failed', typeof errorMessage === 'string' ? errorMessage : 'An error occurred.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    const isApplied = appliedJobIds.has(item.id) || !!item.isApplied || !!(item as any).IsApplied;

    return (
      <View style={[styles.jobCard, item.isPlatinum && styles.platinumCard]}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          {item.isPlatinum && <MaterialIcons name="stars" size={20} color="#FFD700" />}
        </View>
        <Text style={styles.companyName}>{item.companyName}</Text>
        
        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="work" size={16} color="#666" />
            <Text style={styles.detailText}>{item.jobType}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={16} color="#666" />
            <Text style={styles.detailText}>₹{item.minSalary} - ₹{item.maxSalary}</Text>
          </View>
        </View>
        
        <Text style={styles.requirements} numberOfLines={2}>{item.requirements}</Text>

        <TouchableOpacity 
          style={[
            styles.applyButton, 
            isApplied && styles.appliedButton,
            applyingJobId === item.id && styles.applyingButton
          ]} 
          onPress={() => handleApply(item.id)}
          disabled={applyingJobId === item.id || isApplied}
        >
          {applyingJobId === item.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isApplied ? (
            <View style={styles.appliedButtonContent}>
              <MaterialIcons name="check-circle" size={18} color="#15803d" style={{ marginRight: 6 }} />
              <Text style={styles.appliedButtonText}>Applied</Text>
            </View>
          ) : (
            <Text style={styles.applyButtonText}>Apply Now</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for teaching jobs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchJobs(''); }}>
            <MaterialIcons name="clear" size={24} color="#666" />
          </TouchableOpacity>
        )}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No jobs found matching your search.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 50,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#666' },
  
  // Job Card Styles
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    color: '#53c5ab',
    fontWeight: '600',
    marginBottom: 12,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  requirements: {
    fontSize: 14,
    color: '#444',
    marginBottom: 16,
    lineHeight: 20,
  },
  applyButton: {
    backgroundColor: '#53c5ab',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  appliedButton: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  appliedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedButtonText: {
    color: '#15803d',
    fontSize: 15,
    fontWeight: '700',
  },
  applyingButton: {
    backgroundColor: '#084d94',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
