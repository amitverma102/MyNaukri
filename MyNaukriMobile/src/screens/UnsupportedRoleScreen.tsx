import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../authentication/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export const UnsupportedRoleScreen = () => {
  const { userInfo, signOut } = useAuth();

  const handleOpenWebPortal = () => {
    Linking.openURL('https://mynaukri-frontend.greendune-87ffa7a1.centralus.azurecontainerapps.io');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-outline" size={48} color="#53c5ab" />
        </View>

        <Text style={styles.title}>Portal Role Detected</Text>
        <Text style={styles.description}>
          You are currently logged in with a web management role.
        </Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Account:</Text>
            <Text style={styles.value}>{userInfo?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Assigned Role:</Text>
            <Text style={[styles.value, styles.roleHighlight]}>
              {userInfo?.role || 'Unspecified'}
            </Text>
          </View>
        </View>

        <Text style={styles.subtext}>
          Full administrative and institution management features are available on the EduKey360 Web Portal.
        </Text>

        <TouchableOpacity style={styles.portalButton} onPress={handleOpenWebPortal}>
          <Ionicons name="globe-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.portalButtonText}>Launch Web Portal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#e53e3e" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Log Out & Switch Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e6f7f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  roleHighlight: {
    color: '#0d9488',
  },
  subtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  portalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#53c5ab',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  portalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
