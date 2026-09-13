import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native';
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
  const [profileCompleteness, setProfileCompleteness] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileName, setProfileName] = useState<string>('');

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [jobsRes, appsRes, profileRes] = await Promise.all([
        candidateApi.getRecommendedJobs().catch(() => []),
        candidateApi.getMyApplications().catch(() => []),
        candidateApi.getProfile().catch(() => null)
      ]);
      
      setRecommendedJobs(jobsRes);
      setApplications(appsRes);

      if (profileRes) {
        if (profileRes.firstName) {
          setProfileName(profileRes.firstName);
        }
        const fields = [
          profileRes.summary,
          profileRes.skills,
          profileRes.phoneNumber,
          profileRes.totalExperienceYears,
          profileRes.currentSalary,
          profileRes.education,
          profileRes.resumeUrl,
          profileRes.isCtetQualified,
          profileRes.demoVideoUrl
        ];
        const filled = fields.filter(f => f !== null && f !== undefined && f !== '' && f !== 0 && f !== false).length;
        setProfileCompleteness(Math.min(100, Math.max(15, Math.round((filled / fields.length) * 100))));
      } else {
        setProfileCompleteness(20);
      }
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
  const userName = profileName || userInfo?.firstName || (userInfo?.email ? userInfo.email.split('@')[0] : 'User');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.greeting}>Hello {userName}</Text>
            <Text style={styles.subGreeting}>Discover education openings tailored to your profile</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setMenuVisible(true)} 
            style={styles.userMenuTrigger}
            activeOpacity={0.7}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.userNameLabel} numberOfLines={1}>{userName}</Text>
            <Ionicons name="chevron-down" size={14} color="#475569" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* User Account Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuDropdown}>
              <View style={styles.menuHeader}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.menuUserName} numberOfLines={1}>{userName}</Text>
                  <Text style={styles.menuUserEmail} numberOfLines={1}>{userInfo?.email || 'Candidate Account'}</Text>
                </View>
              </View>

              <View style={styles.menuDivider} />

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Profile');
                }}
              >
                <Ionicons name="person-outline" size={18} color="#0d9488" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>My Profile</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  signOut();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#dc2626" style={styles.menuItemIcon} />
                <Text style={[styles.menuItemText, { color: '#dc2626', fontWeight: '600' }]}>LogOut</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {loading ? (
          <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Profile Completion Meter */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.cardTitle}>Profile Strength</Text>
                  <Text style={[styles.statText, { color: '#0d9488' }]}>{profileCompleteness}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${profileCompleteness}%` }]} />
                </View>
                <Text style={styles.subText}>
                  {profileCompleteness < 80 
                    ? 'Add teaching demo video & CTET certification to boost recruiter visibility.' 
                    : 'Your educator profile is well optimized for top school recruiters!'}
                </Text>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={styles.primaryButtonText}>
                    {profileCompleteness < 100 ? 'Improve Profile' : 'Update Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recommended Jobs */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>AI Recommended Openings</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
                  <Text style={styles.viewAllText}>View all &rarr;</Text>
                </TouchableOpacity>
              </View>
              
              {recommendedJobs.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>No recommendations right now. Ensure your resume is uploaded and profile is complete.</Text>
                </View>
              ) : (
                recommendedJobs.slice(0, 3).map(job => (
                  <TouchableOpacity 
                    key={job.id} 
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('JobDetails', { job })}
                  >
                    <View style={styles.jobHeaderRow}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      {job.isPlatinum && <Ionicons name="star" size={16} color="#f59e0b" />}
                    </View>
                    <Text style={styles.schoolName}>{job.companyName}</Text>
                    {job.location && <Text style={styles.locationText}>📍 {job.location}</Text>}
                    <View style={styles.viewJobRow}>
                      <Text style={styles.viewJobText}>View Details &rarr;</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Applications & Interviews */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Applications & Interviews</Text>
              </View>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Applications')}>
                <Text style={styles.statText}>{activeApplicationsCount} Active Applications</Text>
                {applications.length > 0 && (
                  <Text style={styles.subText}>Latest: {applications[0].jobTitle} ({applications[0].status})</Text>
                )}
                <Text style={styles.viewMoreText}>View All Applications &rarr;</Text>
              </TouchableOpacity>
            </View>

            {/* Saved Jobs */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Saved Jobs</Text>
              </View>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SavedJobs')}>
                <Text style={styles.statText}>Review bookmarked positions</Text>
                <Text style={styles.viewMoreText}>Go to Saved Jobs &rarr;</Text>
              </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0d9488',
    borderRadius: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  jobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  viewJobRow: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMenuTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 160,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  userNameLabel: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
    maxWidth: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  menuDropdown: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  largeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuUserEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemIcon: {
    marginRight: 10,
  },
  menuItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
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
