import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { candidateApi } from '../api/candidateApi';

export const CandidateResumeScreen = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentResume();
  }, []);

  const fetchCurrentResume = async () => {
    try {
      const profile = await candidateApi.getProfile();
      if (profile && (profile.resumeUrl || profile.ResumeUrl)) {
        setResumeUrl(profile.resumeUrl || profile.ResumeUrl);
      }
    } catch (error) {
      console.log('Failed to fetch profile', error);
    } finally {
      setFetching(false);
    }
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setLoading(true);

      // The mimeType might be undefined, fallback to pdf if we can't figure it out
      const mimeType = file.mimeType || 'application/pdf';
      
      const response = await candidateApi.uploadResume(file.uri, file.name, mimeType);
      
      setResumeUrl(response.resumeUrl);
      Alert.alert('Success', 'Resume uploaded successfully! It is now being processed in the background.');

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.Message || 'Failed to upload resume. Please try again.';
      Alert.alert('Upload Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Resume Management</Text>
        <Text style={styles.subtitle}>Upload your latest resume to apply for jobs and get parsed skills.</Text>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleUploadResume}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Upload Resume (PDF/DOCX)</Text>
          )}
        </TouchableOpacity>

        {fetching && !resumeUrl ? (
          <ActivityIndicator style={{ marginTop: 32 }} color="#53c5ab" />
        ) : resumeUrl ? (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Current Resume uploaded!</Text>
            <TouchableOpacity onPress={() => Linking.openURL(resumeUrl)} style={styles.viewResumeButton}>
              <Text style={styles.viewResumeText}>View Resume</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  button: {
    height: 50,
    backgroundColor: '#53c5ab',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    alignItems: 'center'
  },
  successTitle: {
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  viewResumeButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2e7d32',
    borderRadius: 6,
  },
  viewResumeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  }
});
