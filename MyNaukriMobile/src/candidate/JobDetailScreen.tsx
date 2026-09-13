import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { candidateApi, Job } from '../api/candidateApi';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

type ParamList = {
  JobDetail: {
    job: Job;
    isSaved?: boolean;
    isApplied?: boolean;
  };
};

export const JobDetailScreen = () => {
  const route = useRoute<RouteProp<ParamList, 'JobDetail'>>();
  const navigation = useNavigation();
  const { job } = route.params;

  const [isSaved, setIsSaved] = useState(route.params.isSaved || false);
  const [isApplied, setIsApplied] = useState(job.isApplied || route.params.isApplied || false);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Screening Questions Modal
  const [screeningModalVisible, setScreeningModalVisible] = useState(false);
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([]);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});

  const handleToggleSave = async () => {
    setSaving(true);
    try {
      await candidateApi.toggleSaveJob(job.id);
      setIsSaved(prev => !prev);
      Alert.alert('Success', isSaved ? 'Job removed from saved list.' : 'Job saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update saved job status.');
    } finally {
      setSaving(false);
    }
  };

  const handleInitiateApply = () => {
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
      setScreeningModalVisible(true);
    } else {
      executeApply();
    }
  };

  const executeApply = async (answersJson?: string) => {
    setApplying(true);
    try {
      await candidateApi.applyToJob(job.id, answersJson);
      setIsApplied(true);
      setScreeningModalVisible(false);
      Alert.alert('Success', 'Successfully applied to this position!');
    } catch (error: any) {
      const msg = error.response?.data?.Message || error.response?.data || 'Failed to submit application.';
      Alert.alert('Notice', typeof msg === 'string' ? msg : 'An error occurred.');
    } finally {
      setApplying(false);
    }
  };

  const handleScreeningSubmit = () => {
    executeApply(JSON.stringify(screeningAnswers));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Job Details</Text>
        <TouchableOpacity onPress={handleToggleSave} disabled={saving} style={styles.bookmarkButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#53c5ab" />
          ) : (
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? '#53c5ab' : '#666'}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Title Card */}
        <View style={styles.mainCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{job.title}</Text>
            {job.isPlatinum && (
              <View style={styles.featuredBadge}>
                <MaterialIcons name="stars" size={16} color="#FFD700" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          <Text style={styles.companyName}>{job.companyName}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.metaText}>{job.location || 'Location Not Specified'}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="work" size={16} color="#666" />
              <Text style={styles.metaText}>{job.jobType}</Text>
            </View>
          </View>

          {job.minSalary && job.maxSalary && (
            <View style={styles.salaryContainer}>
              <MaterialIcons name="attach-money" size={18} color="#15803d" />
              <Text style={styles.salaryText}>
                ₹{(job.minSalary / 100000).toFixed(1)}L - ₹{(job.maxSalary / 100000).toFixed(1)}L PA
              </Text>
            </View>
          )}

          {/* Tags */}
          <View style={styles.tagContainer}>
            {job.workMode && (
              <View style={[styles.tag, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.tagText, { color: '#166534' }]}>{job.workMode}</Text>
              </View>
            )}
            {job.boardAffiliation && (
              <View style={[styles.tag, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.tagText, { color: '#1e40af' }]}>{job.boardAffiliation}</Text>
              </View>
            )}
            {job.subjectDepartment && (
              <View style={[styles.tag, { backgroundColor: '#f5f3ff' }]}>
                <Text style={[styles.tagText, { color: '#6d28d9' }]}>{job.subjectDepartment}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.bodyText}>{job.description || 'No description provided.'}</Text>
        </View>

        {/* Requirements Section */}
        {job.requirements && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Candidate Requirements</Text>
            <Text style={styles.bodyText}>{job.requirements}</Text>
          </View>
        )}

        {/* Screening Questions Notice */}
        {job.screeningQuestionsJson && (
          <View style={[styles.sectionCard, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}>
            <View style={styles.noticeHeader}>
              <MaterialIcons name="quiz" size={18} color="#a16207" />
              <Text style={styles.noticeTitle}>Employer Questionnaire</Text>
            </View>
            <Text style={styles.noticeBody}>
              This institution requires answers to specific screening questions as part of your application.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.applyButton, isApplied && styles.appliedButton]}
          onPress={handleInitiateApply}
          disabled={isApplied || applying}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : isApplied ? (
            <View style={styles.buttonInner}>
              <MaterialIcons name="check-circle" size={20} color="#15803d" style={{ marginRight: 6 }} />
              <Text style={styles.appliedButtonText}>Application Submitted</Text>
            </View>
          ) : (
            <Text style={styles.applyButtonText}>Apply Now</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {/* Screening Questions Modal */}
      <Modal visible={screeningModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Screening Questions</Text>
            <TouchableOpacity onPress={() => setScreeningModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalSubtitle}>
              Please answer the following questions for {job.companyName}:
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

          <SafeAreaView edges={['bottom']} style={styles.modalBottomBar}>
            <TouchableOpacity
              style={[styles.submitButton, applying && styles.disabledButton]}
              onPress={handleScreeningSubmit}
              disabled={applying}
            >
              {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Application</Text>}
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', flex: 1, marginHorizontal: 12 },
  bookmarkButton: { padding: 4 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  featuredText: { fontSize: 12, fontWeight: '700', color: '#a16207', marginLeft: 4 },
  companyName: { fontSize: 16, fontWeight: '600', color: '#3b82f6', marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 14, color: '#64748b', marginLeft: 4 },
  salaryContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  salaryText: { fontSize: 15, fontWeight: '700', color: '#15803d', marginLeft: 4 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 13, fontWeight: '600' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#854d0e', marginLeft: 6 },
  noticeBody: { fontSize: 13, color: '#a16207', lineHeight: 18 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  applyButton: {
    backgroundColor: '#53c5ab',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  appliedButton: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  appliedButtonText: { color: '#15803d', fontSize: 16, fontWeight: '700' },
  buttonInner: { flexDirection: 'row', alignItems: 'center' },
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
  modalScroll: { padding: 16, paddingBottom: 100 },
  questionBlock: { marginBottom: 18 },
  questionText: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  answerInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  modalBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#53c5ab',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.7 },
});
