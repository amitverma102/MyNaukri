import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../api/authApi';
import { Ionicons } from '@expo/vector-icons';

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      Alert.alert('Reset Code Sent', 'If that email is registered, we have dispatched a password reset code.');
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (error: any) {
      Alert.alert('Notice', 'Failed to request reset code. Please check your network connection.');
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

        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your account email to receive a 6-digit password reset code.</Text>

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="your.email@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendReset}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backLink}>
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
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#53c5ab',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
