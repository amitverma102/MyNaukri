import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { authApi } from '../api/authApi';
import { Ionicons } from '@expo/vector-icons';

type ParamList = {
  ResetPassword: {
    email: string;
  };
};

export const ResetPasswordScreen = () => {
  const route = useRoute<RouteProp<ParamList, 'ResetPassword'>>();
  const navigation = useNavigation<any>();
  const email = route.params?.email || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!otp.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please enter the reset code and your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, otp.trim(), newPassword);
      Alert.alert('Password Reset Successful', 'Your password has been changed. You can now log in.', [
        { text: 'Log In', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.Message || error.response?.data || 'Failed to reset password. Please verify the code.';
      Alert.alert('Reset Failed', typeof msg === 'string' ? msg : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Enter the reset code sent to <Text style={{ fontWeight: '700' }}>{email}</Text></Text>

        <Text style={styles.label}>Reset Code</Text>
        <TextInput
          style={styles.input}
          placeholder="6-digit reset code"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 6 characters"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Repeat new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  backButton: { marginBottom: 16, alignSelf: 'flex-start' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#53c5ab',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
