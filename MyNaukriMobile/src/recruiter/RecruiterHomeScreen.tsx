import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
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
  const [upcomingInterviews, setUpcomingInterviews] = useState(0);
  const [pendingUpdateInterviews, setPendingUpdateInterviews] = useState(0);
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
      const now = new Date();
      const upcoming = interviewApps.filter((a: any) => !a.interviewDate || new Date(a.interviewDate) >= now).length;
      const pending = interviewApps.filter((a: any) => a.interviewDate && new Date(a.interviewDate) < now).length;
      
      setActiveJobs(active);
      setClosedJobs(closed);
      setUpcomingInterviews(upcoming);
      setPendingUpdateInterviews(pending);
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

  const [menuVisible, setMenuVisible] = useState(false);
  const userName = userInfo?.firstName || (userInfo?.email ? userInfo.email.split('@')[0] : 'Recruiter');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello {userName}</Text>
            <Text style={styles.subGreeting}>Recruiter Dashboard</Text>
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
            <Ionicons name="chevron-down" size={14} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Recruiter Account Menu Modal */}
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
                  <Text style={styles.menuUserEmail} numberOfLines={1}>{userInfo?.email || 'Recruiter Account'}</Text>
                </View>
              </View>

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
            {pendingUpdateInterviews > 0 && (
              <View style={styles.alertBanner}>
                <Ionicons name="alert-circle" size={20} color="#b45309" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Results Pending Update</Text>
                  <Text style={styles.alertSubtitle}>
                    {pendingUpdateInterviews} scheduled {pendingUpdateInterviews === 1 ? 'interview has' : 'interviews have'} passed their scheduled time and require status updates.
                  </Text>
                </View>
              </View>
            )}

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
                <Text style={styles.statNumber}>{upcomingInterviews}</Text>
                <Text style={styles.statLabel}>Upcoming Interviews</Text>
              </View>
              <View style={[styles.statBox, pendingUpdateInterviews > 0 && styles.statBoxPending]}>
                <Text style={[styles.statNumber, pendingUpdateInterviews > 0 && styles.statNumberPending]}>
                  {pendingUpdateInterviews}
                </Text>
                <Text style={styles.statLabel}>Pending Update</Text>
              </View>
              <View style={[styles.statBox, { width: '100%' }]}>
                <Text style={styles.statNumber}>{credits}</Text>
                <Text style={styles.statLabel}>Credits Available</Text>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 2,
  },
  statBoxPending: {
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    backgroundColor: '#fffdf5',
  },
  statNumberPending: {
    color: '#d97706',
  },
});
