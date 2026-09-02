import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../api/apiClient';
import * as DocumentPicker from 'expo-document-picker';

export const CandidateProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);

  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [experience, setExperience] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [classesTaught, setClassesTaught] = useState('');
  const [boardsTaught, setBoardsTaught] = useState('');
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState('');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/candidates/profile');
      const profile = response.data;
      if (profile) {
        setSummary(profile.summary || profile.Summary || '');
        setSkills(profile.skills || profile.Skills || '');
        setPhoneNumber(profile.phoneNumber || profile.PhoneNumber || '');
        setExperience((profile.totalExperienceYears ?? profile.TotalExperienceYears ?? '').toString());
        setCurrentSalary((profile.currentSalary ?? profile.CurrentSalary ?? '').toString());
        setExpectedSalary((profile.expectedSalary ?? profile.ExpectedSalary ?? '').toString());
        setNoticePeriod(profile.noticePeriod || profile.NoticePeriod || '');
        setCurrentLocation(profile.currentLocation || profile.CurrentLocation || '');
        setPreferredLocations(profile.preferredLocations || profile.PreferredLocations || '');
        setClassesTaught(profile.classesTaught || profile.ClassesTaught || '');
        setBoardsTaught(profile.boardsTaught || profile.BoardsTaught || '');
        setEducation(profile.education || profile.Education || '');
        setCertifications(profile.certifications || profile.Certifications || '');
        setResumeUrl(profile.resumeUrl || profile.ResumeUrl || null);
      }
    } catch (error) {
      console.log('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        summary,
        skills,
        phoneNumber,
        totalExperienceYears: experience ? Number(experience) : null,
        currentSalary: currentSalary ? Number(currentSalary) : null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        noticePeriod,
        currentLocation,
        preferredLocations,
        classesTaught,
        boardsTaught,
        education,
        certifications
      };
      await apiClient.post('/candidates/profile', payload);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setResumeUploading(true);
        const file = result.assets[0];
        const formData = new FormData();
        
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream'
        } as any);

        const response = await apiClient.post('/candidates/parse-resume', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        Alert.alert('Success', 'Resume uploaded and parsed successfully!');
        fetchProfile();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload resume.');
      console.log(error);
    } finally {
      setResumeUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#53c5ab" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Your Profile</Text>

        <TouchableOpacity 
          style={[styles.uploadButton, resumeUploading && styles.disabledButton]} 
          onPress={handleUploadResume}
          disabled={resumeUploading}
        >
          {resumeUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Upload Resume</Text>
          )}
        </TouchableOpacity>
        {resumeUrl && <Text style={styles.linkText}>Resume uploaded successfully</Text>}

        <Text style={styles.label}>Summary</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline value={summary} onChangeText={setSummary} />

        <Text style={styles.label}>Skills</Text>
        <TextInput style={styles.input} value={skills} onChangeText={setSkills} />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />

        <Text style={styles.label}>Total Experience (Years)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={experience} onChangeText={setExperience} />

        <Text style={styles.label}>Current Salary (₹)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={currentSalary} onChangeText={setCurrentSalary} />

        <Text style={styles.label}>Expected Salary (₹)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={expectedSalary} onChangeText={setExpectedSalary} />

        <Text style={styles.label}>Notice Period</Text>
        <TextInput style={styles.input} value={noticePeriod} onChangeText={setNoticePeriod} />

        <Text style={styles.label}>Current Location</Text>
        <TextInput style={styles.input} value={currentLocation} onChangeText={setCurrentLocation} />

        <Text style={styles.label}>Preferred Locations</Text>
        <TextInput style={styles.input} value={preferredLocations} onChangeText={setPreferredLocations} />

        <Text style={styles.label}>Classes Taught</Text>
        <TextInput style={styles.input} value={classesTaught} onChangeText={setClassesTaught} />

        <Text style={styles.label}>Boards Taught</Text>
        <TextInput style={styles.input} value={boardsTaught} onChangeText={setBoardsTaught} />

        <Text style={styles.label}>Education</Text>
        <TextInput style={styles.input} value={education} onChangeText={setEducation} />

        <Text style={styles.label}>Certifications</Text>
        <TextInput style={styles.input} value={certifications} onChangeText={setCertifications} />

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  multiline: { height: 100, textAlignVertical: 'top' },
  uploadButton: { backgroundColor: '#333', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  saveButton: { backgroundColor: '#53c5ab', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#53c5ab', fontSize: 14, textAlign: 'center', marginBottom: 12 }
});
