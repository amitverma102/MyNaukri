import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { candidateApi, Job } from '../api/candidateApi';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export const CandidateJobsScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [workModeFilter, setWorkModeFilter] = useState('All');
  const [boardFilter, setBoardFilter] = useState('All');
  const [datePostedFilter, setDatePostedFilter] = useState('All');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');

  // Screening Questions Modal
  const [screeningModalVisible, setScreeningModalVisible] = useState(false);
  const [screeningJob, setScreeningJob] = useState<Job | null>(null);
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([]);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});

  const fetchJobs = useCallback(async (query: string = '') => {
    try {
      if (!refreshing) setLoading(true);
      
      const [fetchedJobs, applications, savedJobs] = await Promise.all([
        query.trim() === '' ? candidateApi.getAllJobs() : candidateApi.searchJobs(query),
        candidateApi.getMyApplications().catch(() => []),
        candidateApi.getSavedJobs().catch(() => [])
      ]);

      const appliedSet = new Set<string>(applications.map((app: any) => app.jobId));
      fetchedJobs.forEach((job: any) => {
        if (job.isApplied || job.IsApplied) {
          appliedSet.add(job.id);
        }
      });

      const savedSet = new Set<string>(savedJobs.map((sj: any) => sj.jobId));

      setAppliedJobIds(appliedSet);
      setSavedJobIds(savedSet);
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

  const handleToggleSave = async (jobId: string) => {
    try {
      await candidateApi.toggleSaveJob(jobId);
      setSavedJobIds(prev => {
        const next = new Set(prev);
        if (next.has(jobId)) {
          next.delete(jobId);
        } else {
          next.add(jobId);
        }
        return next;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update saved job.');
    }
  };

  const handleInitiateApply = (job: Job) => {
    let questions: string[] = [];
    if (job.screeningQuestionsJson) {
      try {
        const parsed = JSON.parse(job.screeningQuestionsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          questions = parsed;
        }
      } catch (err) {
        console.error('Failed to parse questions', err);
      }
    }

    if (questions.length > 0) {
      const initialAnswers: Record<string, string> = {};
      questions.forEach(q => { initialAnswers[q] = ''; });
      setScreeningQuestions(questions);
      setScreeningAnswers(initialAnswers);
      setScreeningJob(job);
      setScreeningModalVisible(true);
    } else {
      executeApply(job.id);
    }
  };

  const executeApply = async (jobId: string, answersJson?: string) => {
    try {
      setApplyingJobId(jobId);
      await candidateApi.applyToJob(jobId, answersJson);

      setAppliedJobIds(prev => new Set(prev).add(jobId));
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, isApplied: true } : job
        )
      );
      setScreeningModalVisible(false);
      Alert.alert('Success', 'Successfully applied to the job!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.Message || error.response?.data || 'Failed to apply. You may have already applied.';
      Alert.alert('Apply Notice', typeof errorMessage === 'string' ? errorMessage : 'An error occurred.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleScreeningSubmit = () => {
    if (!screeningJob) return;
    executeApply(screeningJob.id, JSON.stringify(screeningAnswers));
  };

  // Client-side faceted filtering
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Work mode
      if (workModeFilter !== 'All' && job.workMode?.toLowerCase() !== workModeFilter.toLowerCase()) {
        return false;
      }
      // Board affiliation
      if (boardFilter !== 'All' && !job.boardAffiliation?.toLowerCase().includes(boardFilter.toLowerCase())) {
        return false;
      }
      // Min salary
      if (minSalaryFilter) {
        const minSalaryNum = parseInt(minSalaryFilter, 10);
        if (!isNaN(minSalaryNum) && (job.maxSalary || 0) < minSalaryNum && (job.minSalary || 0) < minSalaryNum) {
          return false;
        }
      }
      // Date posted
      if (datePostedFilter !== 'All' && job.createdAt) {
        const jobDate = new Date(job.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - jobDate) / (1000 * 60 * 60);
        if (datePostedFilter === '24h' && diffHours > 24) return false;
        if (datePostedFilter === '7d' && diffHours > 24 * 7) return false;
        if (datePostedFilter === '30d' && diffHours > 24 * 30) return false;
      }
      return true;
    });
  }, [jobs, workModeFilter, boardFilter, datePostedFilter, minSalaryFilter]);

  const hasActiveFilters = workModeFilter !== 'All' || boardFilter !== 'All' || datePostedFilter !== 'All' || minSalaryFilter !== '';

  const renderJobCard = ({ item }: { item: Job }) => {
    const isApplied = appliedJobIds.has(item.id) || !!item.isApplied || !!(item as any).IsApplied;
    const isSaved = savedJobIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.jobCard, item.isPlatinum && styles.platinumCard]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('JobDetails', { job: item, isSaved, isApplied })}
      >
        <View style={styles.jobHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.companyName}>{item.companyName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.isPlatinum && <MaterialIcons name="stars" size={20} color="#FFD700" />}
            <TouchableOpacity onPress={() => handleToggleSave(item.id)} style={{ padding: 4 }}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isSaved ? '#53c5ab' : '#94a3b8'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="work" size={16} color="#666" />
            <Text style={styles.detailText}>{item.jobType}</Text>
          </View>
          {item.minSalary && item.maxSalary && (
            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={16} color="#15803d" />
              <Text style={[styles.detailText, { color: '#15803d', fontWeight: '600' }]}>
                ₹{(item.minSalary / 100000).toFixed(1)}L - ₹{(item.maxSalary / 100000).toFixed(1)}L PA
              </Text>
            </View>
          )}
        </View>

        {(item.workMode || item.boardAffiliation || item.subjectDepartment) && (
          <View style={styles.tagContainer}>
            {item.workMode && (
              <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.badgeText, { color: '#166534' }]}>{item.workMode}</Text>
              </View>
            )}
            {item.boardAffiliation && (
              <View style={[styles.badge, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.badgeText, { color: '#1e40af' }]}>{item.boardAffiliation}</Text>
              </View>
            )}
            {item.subjectDepartment && (
              <View style={[styles.badge, { backgroundColor: '#f5f3ff' }]}>
                <Text style={[styles.badgeText, { color: '#6d28d9' }]}>{item.subjectDepartment}</Text>
              </View>
            )}
          </View>
        )}
        
        <Text style={styles.requirements} numberOfLines={2}>{item.requirements}</Text>

        <TouchableOpacity 
          style={[
            styles.applyButton, 
            isApplied && styles.appliedButton,
            applyingJobId === item.id && styles.applyingButton
          ]} 
          onPress={() => handleInitiateApply(item)}
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
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Search & Filter Header Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={22} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles, subjects, cities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchJobs(''); }}>
              <MaterialIcons name="clear" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterIconButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={hasActiveFilters ? '#fff' : '#475569'} />
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFilterLabel}>Filters applied</Text>
          <TouchableOpacity
            onPress={() => {
              setWorkModeFilter('All');
              setBoardFilter('All');
              setDatePostedFilter('All');
              setMinSalaryFilter('');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#53c5ab" />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No jobs match your search or filter criteria.</Text>
            </View>
          }
        />
      )}

      {/* Faceted Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Openings</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.filterModalScroll}>
            {/* Work Mode */}
            <Text style={styles.filterSectionTitle}>Work Mode</Text>
            <View style={styles.chipRow}>
              {['All', 'In-Person', 'Remote', 'Hybrid'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.chip, workModeFilter === mode && styles.chipActive]}
                  onPress={() => setWorkModeFilter(mode)}
                >
                  <Text style={[styles.chipText, workModeFilter === mode && styles.chipTextActive]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Board Affiliation */}
            <Text style={styles.filterSectionTitle}>Board Affiliation</Text>
            <View style={styles.chipRow}>
              {['All', 'CBSE', 'ICSE', 'IB', 'Cambridge', 'State Board'].map(board => (
                <TouchableOpacity
                  key={board}
                  style={[styles.chip, boardFilter === board && styles.chipActive]}
                  onPress={() => setBoardFilter(board)}
                >
                  <Text style={[styles.chipText, boardFilter === board && styles.chipTextActive]}>
                    {board}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Posted */}
            <Text style={styles.filterSectionTitle}>Date Posted</Text>
            <View style={styles.chipRow}>
              {[
                { label: 'Anytime', value: 'All' },
                { label: 'Past 24 Hours', value: '24h' },
                { label: 'Past 7 Days', value: '7d' },
                { label: 'Past 30 Days', value: '30d' }
              ].map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.chip, datePostedFilter === item.value && styles.chipActive]}
                  onPress={() => setDatePostedFilter(item.value)}
                >
                  <Text style={[styles.chipText, datePostedFilter === item.value && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Min Salary */}
            <Text style={styles.filterSectionTitle}>Minimum Annual Salary (₹)</Text>
            <TextInput
              style={styles.filterInput}
              keyboardType="numeric"
              placeholder="e.g. 500000"
              value={minSalaryFilter}
              onChangeText={setMinSalaryFilter}
            />
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.filterBottomBar}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setWorkModeFilter('All');
                setBoardFilter('All');
                setDatePostedFilter('All');
                setMinSalaryFilter('');
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterButtonText}>Apply Filters ({filteredJobs.length})</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaView>
      </Modal>

      {/* Screening Questions Modal */}
      <Modal visible={screeningModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Screening Questions</Text>
            <TouchableOpacity onPress={() => setScreeningModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.filterModalScroll}>
            <Text style={styles.modalSubtitle}>
              Please answer the following questions for {screeningJob?.companyName}:
            </Text>

            {screeningQuestions.map((question, index) => (
              <View key={index} style={styles.questionBlock}>
                <Text style={styles.questionText}>{index + 1}. {question}</Text>
                <TextInput
                  style={styles.answerInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Type your response..."
                  value={screeningAnswers[question] || ''}
                  onChangeText={(text) => setScreeningAnswers(prev => ({ ...prev, [question]: text }))}
                />
              </View>
            ))}
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.filterBottomBar}>
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={handleScreeningSubmit}
            >
              <Text style={styles.applyFilterButtonText}>Submit Application</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  filterIconButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#53c5ab',
    borderColor: '#53c5ab',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  activeFilterLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  clearFiltersText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: '#64748b' },
  
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#53c5ab',
  },
  platinumCard: {
    borderLeftColor: '#f59e0b',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirements: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 14,
    lineHeight: 20,
  },
  applyButton: {
    backgroundColor: '#53c5ab',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  appliedButton: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  appliedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedButtonText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '700',
  },
  applyingButton: {
    backgroundColor: '#084d94',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  filterModalScroll: { padding: 16, paddingBottom: 100 },
  filterSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#53c5ab',
    borderColor: '#53c5ab',
  },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  filterInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
  },
  filterBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  resetButtonText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  applyFilterButton: {
    flex: 1,
    backgroundColor: '#53c5ab',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFilterButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  questionBlock: { marginBottom: 16 },
  questionText: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  answerInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
});
