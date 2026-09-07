import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../authentication/AuthContext';
import { apiClient } from '../api/apiClient';
import { Ionicons } from '@expo/vector-icons';

interface InstitutionItem {
  id: string;
  name: string;
  type: string;
  status: string;
  walletBalance: number;
}

export const AdminHomeScreen = () => {
  const { userInfo, signOut } = useAuth();
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInstitutions = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await apiClient.get('/EduTechAdmin/institutions');
      setInstitutions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch admin institutions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInstitutions();
  };

  const openWebPortal = () => {
    Linking.openURL('https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io');
  };

  const totalCredits = institutions.reduce((sum, inst) => sum + (inst.walletBalance || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53c5ab']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>EduTech Admin</Text>
            <Text style={styles.subtitle}>Super Administrator</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={18} color="#dc2626" style={{ marginRight: 4 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{institutions.length}</Text>
            <Text style={styles.statLabel}>Institutions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalCredits}</Text>
            <Text style={styles.statLabel}>Total Credits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>Online</Text>
            <Text style={styles.statLabel}>Azure Cloud</Text>
          </View>
        </View>

        {/* Web Portal Banner */}
        <View style={styles.webBanner}>
          <Ionicons name="desktop-outline" size={24} color="#0d9488" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.webBannerTitle}>Full Management Portal</Text>
            <Text style={styles.webBannerDesc}>
              Issue credits, configure platform rules, and manage all accounts via the web portal.
            </Text>
          </View>
          <TouchableOpacity style={styles.launchBtn} onPress={openWebPortal}>
            <Text style={styles.launchBtnText}>Open</Text>
          </TouchableOpacity>
        </View>

        {/* Institutions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Registered Institutions</Text>
            <Text style={styles.badge}>{institutions.length}</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#53c5ab" style={{ marginTop: 24 }} />
          ) : institutions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No institutions registered yet.</Text>
            </View>
          ) : (
            institutions.map((inst) => (
              <View key={inst.id} style={styles.instCard}>
                <View style={styles.instHeader}>
                  <Text style={styles.instName}>{inst.name}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{inst.status || 'Active'}</Text>
                  </View>
                </View>
                <View style={styles.instDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailVal}>{inst.type || 'Educational'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Credits:</Text>
                    <Text style={[styles.detailVal, { color: '#0d9488', fontWeight: '700' }]}>
                      {inst.walletBalance ?? 0}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Footer Logout Button */}
        <TouchableOpacity style={styles.footerLogoutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.footerLogoutText}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 48,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  webBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  webBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#134e4a',
  },
  webBannerDesc: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 2,
    lineHeight: 16,
  },
  launchBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  launchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
  },
  badge: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  instCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  instHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  instName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  statusPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '600',
  },
  instDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 4,
  },
  detailVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  footerLogoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  footerLogoutText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
