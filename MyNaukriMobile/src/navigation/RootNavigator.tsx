import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../authentication/AuthContext';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CandidateHomeScreen } from '../candidate/CandidateHomeScreen';
import { CandidateJobsScreen } from '../candidate/CandidateJobsScreen';
import { CandidateProfileScreen } from '../candidate/CandidateProfileScreen';
import { CandidateResumeScreen } from '../candidate/CandidateResumeScreen';
import { CandidateSavedJobsScreen } from '../candidate/CandidateSavedJobsScreen';
import { CandidateApplicationsScreen } from '../candidate/CandidateApplicationsScreen';
import { JobDetailScreen } from '../candidate/JobDetailScreen';
import { Ionicons } from '@expo/vector-icons';

const CandidateTab = createBottomTabNavigator();
const CandidateTabNavigator = () => (
  <CandidateTab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ color, size }) => {
      let iconName: keyof typeof Ionicons.glyphMap = 'home';
      if (route.name === 'Home') iconName = 'home';
      else if (route.name === 'Jobs') iconName = 'briefcase';
      else if (route.name === 'Resume') iconName = 'document-text';
      else if (route.name === 'Profile') iconName = 'person';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#53c5ab',
    tabBarInactiveTintColor: 'gray',
  })}>
    <CandidateTab.Screen name="Home" component={CandidateHomeScreen} />
    <CandidateTab.Screen name="Jobs" component={CandidateJobsScreen} />
    <CandidateTab.Screen name="Resume" component={CandidateResumeScreen} />
    <CandidateTab.Screen name="Profile" component={CandidateProfileScreen} />
  </CandidateTab.Navigator>
);

const CandidateStack = createNativeStackNavigator();
const CandidateNavigator = () => (
  <CandidateStack.Navigator screenOptions={{ headerShown: false }}>
    <CandidateStack.Screen name="CandidateTabs" component={CandidateTabNavigator} />
    <CandidateStack.Screen name="JobDetails" component={JobDetailScreen} />
    <CandidateStack.Screen name="SavedJobs" component={CandidateSavedJobsScreen} />
    <CandidateStack.Screen name="Applications" component={CandidateApplicationsScreen} />
  </CandidateStack.Navigator>
);

import { RecruiterHomeScreen } from '../recruiter/RecruiterHomeScreen';
import { RecruiterJobsScreen } from '../recruiter/RecruiterJobsScreen';
import { RecruiterProfileScreen } from '../recruiter/RecruiterProfileScreen';
import { RecruiterCandidateSearchScreen } from '../recruiter/RecruiterCandidateSearchScreen';

const RecruiterTab = createBottomTabNavigator();
const RecruiterNavigator = () => (
  <RecruiterTab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ color, size }) => {
      let iconName: keyof typeof Ionicons.glyphMap = 'home';
      if (route.name === 'Home') iconName = 'home';
      else if (route.name === 'Manage Jobs') iconName = 'list';
      else if (route.name === 'Search Resdex') iconName = 'search';
      else if (route.name === 'Settings') iconName = 'settings';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#53c5ab',
    tabBarInactiveTintColor: 'gray',
  })}>
    <RecruiterTab.Screen name="Home" component={RecruiterHomeScreen} />
    <RecruiterTab.Screen name="Manage Jobs" component={RecruiterJobsScreen} />
    <RecruiterTab.Screen name="Search Resdex" component={RecruiterCandidateSearchScreen} />
    <RecruiterTab.Screen name="Settings" component={RecruiterProfileScreen} />
  </RecruiterTab.Navigator>
);

import { LoginScreen } from '../authentication/LoginScreen';
import { RegisterScreen } from '../authentication/RegisterScreen';
import { VerifyOtpScreen } from '../authentication/VerifyOtpScreen';
import { ForgotPasswordScreen } from '../authentication/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../authentication/ResetPasswordScreen';
import { AdminHomeScreen } from '../admin/AdminHomeScreen';
import { UnsupportedRoleScreen } from '../screens/UnsupportedRoleScreen';

const AuthStack = createNativeStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </AuthStack.Navigator>
);

const AdminStack = createNativeStackNavigator();

const AdminNavigator = () => (
  <AdminStack.Navigator screenOptions={{ headerShown: false }}>
    <AdminStack.Screen name="AdminHome" component={AdminHomeScreen} />
  </AdminStack.Navigator>
);

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isLoading, userToken, userInfo } = useAuth();

  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync();
    }
  }, [userToken]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken == null ? (
        // No token found, user isn't signed in
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        // User is signed in
        userInfo?.role === 'Candidate' ? (
          <Stack.Screen name="Candidate" component={CandidateNavigator} />
        ) : userInfo?.role === 'Recruiter' ? (
          <Stack.Screen name="Recruiter" component={RecruiterNavigator} />
        ) : userInfo?.role === 'SuperAdministrator' || userInfo?.email?.toLowerCase() === 'edutechadmin' ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Unauthorized" component={UnsupportedRoleScreen} />
        )
      )}
    </Stack.Navigator>
  );
};

