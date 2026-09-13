import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { authApi } from '../api/authApi';
import { Ionicons } from '@expo/vector-icons';

type ParamList = {
  VerifyOtp: {
    email: string;
  };
};

export const VerifyOtpScreen = () => {
  const route = useRoute<RouteProp<ParamList, 'VerifyOtp'>>();
  const navigation = useNavigation<any>();
  const email = route.params?.email || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyOtp(email, otp.trim());
      Alert.alert('Account Verified!', 'Your account has been successfully verified. You can now log in.', [
        { text: 'Log In', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.Message || error.response?.data || error.message || 'Verification failed.';
      Alert.alert('Verification Failed', typeof msg === 'string' ? msg : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit security code to <Text style={{ fontWeight: '700', color: '#0f172a' }}>{email}</Text>.
        </Text>

        <TextInput
          style={styles.otpInput}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 20 },
  otpInput: {
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#53c5ab',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
