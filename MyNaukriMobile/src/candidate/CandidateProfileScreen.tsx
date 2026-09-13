import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../api/apiClient';
import { authApi } from '../api/authApi';
import { candidateApi } from '../api/candidateApi';
import { useAuth } from '../authentication/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export const CandidateProfileScreen = () => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [demoVideoStatus, setDemoVideoStatus] = useState('Unverified');
  const [demoVideoSubject, setDemoVideoSubject] = useState('');
  const [demoVideoSummary, setDemoVideoSummary] = useState('');
  const [demoVideoRejectionReason, setDemoVideoRejectionReason] = useState('');
  const [reverifyingVideo, setReverifyingVideo] = useState(false);
  const [isCtetQualified, setIsCtetQualified] = useState(false);
  const [ctetDetails, setCtetDetails] = useState('');
  const [currentInstitution, setCurrentInstitution] = useState('');
  const [blockedInstitutions, setBlockedInstitutions] = useState('');
  const [joiningAvailability, setJoiningAvailability] = useState('');
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
        setDemoVideoUrl(profile.demoVideoUrl || profile.DemoVideoUrl || '');
        setDemoVideoStatus(profile.demoVideoStatus || profile.DemoVideoStatus || 'Unverified');
        setDemoVideoSubject(profile.demoVideoSubject || profile.DemoVideoSubject || '');
        setDemoVideoSummary(profile.demoVideoSummary || profile.DemoVideoSummary || '');
        setDemoVideoRejectionReason(profile.demoVideoRejectionReason || profile.DemoVideoRejectionReason || '');
        setIsCtetQualified(Boolean(profile.isCtetQualified ?? profile.IsCtetQualified));
        setCtetDetails(profile.ctetDetails || profile.CtetDetails || '');
        setCurrentInstitution(profile.currentInstitution || profile.CurrentInstitution || '');
        setBlockedInstitutions(profile.blockedInstitutions || profile.BlockedInstitutions || '');
        setJoiningAvailability(profile.joiningAvailability || profile.JoiningAvailability || '');
        setResumeUrl(profile.resumeUrl || profile.ResumeUrl || null);
      }
    } catch (error) {
      console.log('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReverifyVideo = async () => {
    try {
      setReverifyingVideo(true);
      await candidateApi.reverifyDemoVideo();
      setDemoVideoStatus('Pending');
      Alert.alert('Verification Queued', 'Our multimodal AI is analyzing your demo video for teaching content and community safety.');
      fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to trigger verification.');
    } finally {
      setReverifyingVideo(false);
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
        certifications,
        demoVideoUrl,
        isCtetQualified,
        ctetDetails,
        currentInstitution,
        blockedInstitutions,
        joiningAvailability
      };
      await apiClient.post('/candidates/profile', payload);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account Permanently",
      "Are you sure you want to permanently delete your EduKey360 account? All your personal information, uploaded resumes, demo videos, and application records will be immediately anonymized and erased in compliance with India DPDP Act 2023. This action cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await authApi.deleteAccount();
              Alert.alert("Account Deleted", "Your account and data have been permanently removed.");
              await signOut();
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || err.response?.data || "Failed to delete account. Please try again.");
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
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

        <View style={styles.resumeActions}>
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
          {resumeUrl && (
            <TouchableOpacity 
              style={styles.viewButton} 
              onPress={() => Linking.openURL(resumeUrl)}
            >
              <Text style={styles.viewButtonText}>View Resume</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <View style={styles.switchRow}>
          <Text style={[styles.label, { marginTop: 0 }]}>CTET / State TET Qualified</Text>
          <Switch
            value={isCtetQualified}
            onValueChange={setIsCtetQualified}
            trackColor={{ false: '#ddd', true: '#53c5ab' }}
          />
        </View>

        {isCtetQualified && (
          <>
            <Text style={styles.label}>CTET / TET Details (Paper, Year, Score)</Text>
            <TextInput 
              style={styles.input} 
              value={ctetDetails} 
              onChangeText={setCtetDetails} 
              placeholder="e.g. Paper 2 Math & Science - 2023"
            />
          </>
        )}

        <Text style={styles.label}>Teaching Demo Video URL (YouTube, Loom, Drive)</Text>
        <TextInput 
          style={styles.input} 
          value={demoVideoUrl} 
          onChangeText={setDemoVideoUrl} 
          placeholder="https://youtu.be/..."
        />

        {demoVideoUrl.length > 0 && (
          <View style={styles.videoStatusCard}>
            {demoVideoStatus === 'Verified' && (
              <View style={styles.verifiedBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginRight: 6 }} />
                  <Text style={styles.verifiedTitle}>AI Verified Teaching Demo</Text>
                </View>
                {demoVideoSubject ? <Text style={styles.verifiedSubject}>Subject: {demoVideoSubject}</Text> : null}
                {demoVideoSummary ? <Text style={styles.verifiedSummary}>{demoVideoSummary}</Text> : null}
              </View>
            )}

            {demoVideoStatus === 'Pending' && (
              <View style={styles.pendingBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="time" size={18} color="#d97706" style={{ marginRight: 6 }} />
                  <Text style={styles.pendingTitle}>AI Video Verification In Progress...</Text>
                </View>
                <Text style={styles.pendingText}>Analyzing instructional delivery and community safety.</Text>
              </View>
            )}

            {demoVideoStatus === 'Rejected' && (
              <View style={styles.rejectedBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 6 }} />
                  <Text style={styles.rejectedTitle}>Demo Video Flagged / Rejected</Text>
                </View>
                <Text style={styles.rejectedText}>{demoVideoRejectionReason || 'Video was flagged as not related to teaching or violating guidelines.'}</Text>
                <Text style={styles.rejectedSubtext}>Please update with an educational demonstration.</Text>
              </View>
            )}

            {demoVideoStatus === 'Unverified' && (
              <View style={styles.unverifiedBox}>
                <Text style={styles.unverifiedText}>Save profile to verify, or check now:</Text>
                <TouchableOpacity style={styles.reverifyBtn} onPress={handleReverifyVideo} disabled={reverifyingVideo}>
                  {reverifyingVideo ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reverifyBtnText}>Verify Video with AI</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <Text style={styles.label}>Current Institution / School</Text>
        <TextInput 
          style={styles.input} 
          value={currentInstitution} 
          onChangeText={setCurrentInstitution} 
          placeholder="e.g. Delhi Public School"
        />

        <Text style={styles.label}>Confidentiality: Blocked Institutions</Text>
        <TextInput 
          style={styles.input} 
          value={blockedInstitutions} 
          onChangeText={setBlockedInstitutions} 
          placeholder="Institutions to hide your profile from"
        />

        <Text style={styles.label}>Joining Availability</Text>
        <TextInput 
          style={styles.input} 
          value={joiningAvailability} 
          onChangeText={setJoiningAvailability} 
          placeholder="e.g. Immediate, 15 Days, Next Academic Session"
        />

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

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* Legal & App Store Compliance */}
        <View style={styles.legalLinksContainer}>
          <TouchableOpacity onPress={() => Linking.openURL('https://edukey360.com/privacy-policy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://edukey360.com/terms-conditions')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Self-Serve Account Deletion (Google Play & Apple Store Mandate) */}
        <TouchableOpacity 
          style={[styles.deleteButton, deleting && styles.disabledButton]} 
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={styles.deleteButtonText}>Delete Account &amp; Erase Data</Text>
            </>
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  resumeActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  uploadButton: { flex: 1, backgroundColor: '#333', padding: 14, borderRadius: 8, alignItems: 'center' },
  viewButton: { flex: 1, backgroundColor: '#53c5ab', padding: 14, borderRadius: 8, alignItems: 'center' },
  viewButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveButton: { backgroundColor: '#53c5ab', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#53c5ab', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    marginTop: 14,
  },
  logoutButtonText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  videoStatusCard: { marginTop: 8, marginBottom: 8 },
  verifiedBox: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#86efac' },
  verifiedTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  verifiedSubject: { fontSize: 13, fontWeight: '600', color: '#15803d', marginTop: 2 },
  verifiedSummary: { fontSize: 12, color: '#14532d', marginTop: 4 },
  pendingBox: { backgroundColor: '#fffbeb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' },
  pendingTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  pendingText: { fontSize: 12, color: '#78350f', marginTop: 2 },
  rejectedBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  rejectedTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  rejectedText: { fontSize: 12, color: '#b91c1c', marginTop: 2 },
  rejectedSubtext: { fontSize: 11, color: '#7f1d1d', marginTop: 4, fontStyle: 'italic' },
  unverifiedBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  unverifiedText: { fontSize: 12, color: '#64748b', flex: 1, marginRight: 8 },
  reverifyBtn: { backgroundColor: '#53c5ab', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  reverifyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  legalLink: {
    fontSize: 13,
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  legalDot: {
    marginHorizontal: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
});
