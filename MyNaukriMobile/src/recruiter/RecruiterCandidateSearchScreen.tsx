import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recruiterApi } from '../api/recruiterApi';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export const RecruiterCandidateSearchScreen = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [isCtetQualified, setIsCtetQualified] = useState(false);
  const [verifiedDemoOnly, setVerifiedDemoOnly] = useState(false);
  const [lastUpdatedDays, setLastUpdatedDays] = useState<number | undefined>(undefined);

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Just now';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const expNum = minExperience ? parseInt(minExperience, 10) : undefined;
      const results = await recruiterApi.searchCandidates({
        keyword: keyword.trim() || undefined,
        location: location.trim() || undefined,
        minExperience: !isNaN(expNum as number) ? expNum : undefined,
        noticePeriod: noticePeriod || undefined,
        isCtetQualified: isCtetQualified ? true : undefined,
        verifiedDemoOnly: verifiedDemoOnly ? true : undefined,
        lastUpdatedDays: lastUpdatedDays,
      });
      setCandidates(results || []);
    } catch (error) {
      console.error('Failed to search candidates', error);
      Alert.alert('Error', 'Failed to perform candidate search.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [keyword, location, minExperience, noticePeriod, isCtetQualified, verifiedDemoOnly, lastUpdatedDays]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCandidates();
  };

  const handleUnlockContact = async (candidateId: string) => {
    Alert.alert(
      'Unlock Contact Details',
      'Unlocking this candidate will consume recruiter credits. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            try {
              const res = await recruiterApi.unlockContact(candidateId);
              Alert.alert('Success', `Contact unlocked! Phone: ${res.phoneNumber || 'Available in profile'}`);
              fetchCandidates();
            } catch (err: any) {
              const msg = err.response?.data?.message || err.response?.data || 'Failed to unlock contact.';
              Alert.alert('Notice', typeof msg === 'string' ? msg : 'An error occurred.');
            }
          }
        }
      ]
    );
  };

  const renderCandidateCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.candidateName}>{item.name || item.Name || `Candidate #${item.id.substring(0, 6)}`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text style={styles.candidateLocation}>📍 {item.currentLocation || item.CurrentLocation || 'Location Unspecified'}</Text>
            {(item.updatedAt || item.UpdatedAt) && (
              <Text style={styles.candidateUpdated}>• Active: {formatRelativeTime(item.updatedAt || item.UpdatedAt)}</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {(item.aiRecommendationScore !== undefined && item.aiRecommendationScore !== null) && (
            <View style={[
              styles.aiBadge, 
              { backgroundColor: item.aiRecommendationScore >= 80 ? '#f0fdf4' : item.aiRecommendationScore >= 60 ? '#f0f9ff' : '#f8fafc',
                borderColor: item.aiRecommendationScore >= 80 ? '#86efac' : item.aiRecommendationScore >= 60 ? '#bae6fd' : '#e2e8f0' }
            ]}>
              <MaterialIcons 
                name="auto-awesome" 
                size={12} 
                color={item.aiRecommendationScore >= 80 ? '#16a34a' : item.aiRecommendationScore >= 60 ? '#0284c7' : '#64748b'} 
              />
              <Text style={[
                styles.aiScoreText,
                { color: item.aiRecommendationScore >= 80 ? '#15803d' : item.aiRecommendationScore >= 60 ? '#0284c7' : '#475569' }
              ]}>
                {Math.round(item.aiRecommendationScore)}% Fit
              </Text>
            </View>
          )}
          {(item.isCtetQualified || item.IsCtetQualified) && (
            <View style={styles.ctetBadge}>
              <MaterialIcons name="verified" size={14} color="#15803d" />
              <Text style={styles.ctetText}>CTET</Text>
            </View>
          )}
        </View>
      </View>

      {(item.aiRecommendationReason || item.AiRecommendationReason) && (
        <Text style={styles.aiReasonText} numberOfLines={1}>
          🤖 {item.aiRecommendationReason || item.AiRecommendationReason}
        </Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Exp: <Text style={styles.metaBold}>{item.totalExperienceYears ?? item.TotalExperienceYears ?? 0} yrs</Text>
        </Text>
        {(item.noticePeriod || item.NoticePeriod) && (
          <Text style={styles.metaText}>
            Notice: <Text style={styles.metaBold}>{item.noticePeriod || item.NoticePeriod}</Text>
          </Text>
        )}
        {(item.currentInstitution || item.CurrentInstitution) && (
          <Text style={styles.metaText}>
            Inst: <Text style={styles.metaBold}>{item.currentInstitution || item.CurrentInstitution}</Text>
          </Text>
        )}
      </View>

      {(item.skills || item.Skills) && (
        <View style={styles.skillsContainer}>
          {(item.skills || item.Skills).split(',').slice(0, 4).map((s: string, idx: number) => (
            <View key={idx} style={styles.skillChip}>
              <Text style={styles.skillText}>{s.trim()}</Text>
            </View>
          ))}
        </View>
      )}

      {(item.summary || item.Summary) && (
        <Text style={styles.summaryText} numberOfLines={2}>
          {item.summary || item.Summary}
        </Text>
      )}

      {/* Action Row */}
      <View style={styles.cardActions}>
        {(item.demoVideoUrl || item.DemoVideoUrl) && (item.demoVideoStatus === 'Verified' || item.DemoVideoStatus === 'Verified') ? (
          <TouchableOpacity
            style={[styles.videoButton, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}
            onPress={() => Linking.openURL(item.demoVideoUrl || item.DemoVideoUrl)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginRight: 4 }} />
            <Text style={[styles.videoButtonText, { color: '#166534', fontWeight: '700' }]}>
              ✓ Verified Demo {item.demoVideoSubject ? `(${item.demoVideoSubject})` : ''}
            </Text>
          </TouchableOpacity>
        ) : (item.demoVideoUrl || item.DemoVideoUrl) && (item.demoVideoStatus !== 'Rejected' && item.DemoVideoStatus !== 'Rejected') ? (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => Linking.openURL(item.demoVideoUrl || item.DemoVideoUrl)}
          >
            <Ionicons name="play-circle" size={18} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={styles.videoButtonText}>Demo Video</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => handleUnlockContact(item.id)}
        >
          <MaterialIcons name="call" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.contactButtonText}>View Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Candidate Resdex</Text>
        <Text style={styles.subtitle}>Search verified educators, teachers, and faculty</Text>
      </View>

      {/* Search Filter Bar */}
      <View style={styles.searchBox}>
        <View style={styles.inputRow}>
          <MaterialIcons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Skills, subject, or designation..."
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={fetchCandidates}
            returnKeyType="search"
          />
        </View>

        <View style={styles.filterRow}>
          <TextInput
            style={[styles.smallInput, { flex: 1 }]}
            placeholder="City/Location"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            style={[styles.smallInput, { width: 90 }]}
            placeholder="Min Exp"
            keyboardType="numeric"
            value={minExperience}
            onChangeText={setMinExperience}
          />
          <TouchableOpacity
            style={[styles.ctetToggle, isCtetQualified && styles.ctetToggleActive]}
            onPress={() => setIsCtetQualified(prev => !prev)}
          >
            <Text style={[styles.ctetToggleText, isCtetQualified && styles.ctetToggleTextActive]}>
              CTET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctetToggle, verifiedDemoOnly && styles.demoToggleActive]}
            onPress={() => setVerifiedDemoOnly(prev => !prev)}
          >
            <Text style={[styles.ctetToggleText, verifiedDemoOnly && styles.demoToggleTextActive]}>
              ✓ Verified Demo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Last Updated Quick Filter Row */}
        <View style={styles.quickFiltersRow}>
          <Text style={styles.quickFilterLabel}>Active:</Text>
          {[
            { label: 'All', value: undefined },
            { label: '1 Day', value: 1 },
            { label: '1 Week', value: 7 },
            { label: '15 Days', value: 15 },
            { label: '1 Month', value: 30 }
          ].map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={[styles.quickFilterChip, lastUpdatedDays === chip.value && styles.quickFilterChipActive]}
              onPress={() => setLastUpdatedDays(chip.value)}
            >
              <Text style={[styles.quickFilterChipText, lastUpdatedDays === chip.value && styles.quickFilterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#53c5ab" />
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          renderItem={renderCandidateCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No candidates found matching criteria.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  searchBox: {
    backgroundColor: '#fff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 14, color: '#1e293b' },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
  },
  ctetToggle: {
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctetToggleActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  ctetToggleText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  ctetToggleTextActive: { color: '#15803d', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  candidateName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  candidateLocation: { fontSize: 13, color: '#64748b' },
  candidateUpdated: { fontSize: 12, color: '#0284c7', fontWeight: '500' },
  quickFiltersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  quickFilterLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  quickFilterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickFilterChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  quickFilterChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  quickFilterChipTextActive: { color: '#fff', fontWeight: '700' },
  ctetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ctetText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  aiScoreText: { fontSize: 11, fontWeight: '700' },
  aiReasonText: { fontSize: 12, color: '#0284c7', marginTop: 4, fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 6 },
  metaText: { fontSize: 13, color: '#64748b' },
  metaBold: { fontWeight: '700', color: '#1e293b' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  skillChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  skillText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  summaryText: { fontSize: 13, color: '#334155', lineHeight: 18, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  videoButtonText: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#53c5ab',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  contactButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  demoToggleActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  demoToggleTextActive: { color: '#15803d', fontWeight: '700' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});
