import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { supabase } from '../config/supabase';
import RegisterScreen from '../screens/Auth/RegisterScreen';

const Stack = createNativeStackNavigator<any>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  const [profileLoading, setProfileLoading] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkProfile = async () => {
      if (!user) {
        if (!mounted) return;
        setNeedsProfileSetup(false);
        return;
      }

      setProfileLoading(true);

      // ✅ retry once (fixes race condition after email confirm/login)
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
          .from('app_d56ee_profiles')
          .select('id, full_name, label, age, gender, contact_number')
          .eq('auth_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (!error && data) {
          const incomplete =
            !data.full_name ||
            !data.label ||
            !data.age ||
            !data.gender ||
            !data.contact_number;

          setNeedsProfileSetup(incomplete);
          setProfileLoading(false);
          return;
        }

        if (error) {
          console.error('Profile check error (auth_id):', error);
        }

        const { data: dataById, error: errorById } = await supabase
          .from('app_d56ee_profiles')
          .select('id, full_name, label, age, gender, contact_number')
          .eq('id', user.id)
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (!errorById && dataById) {
          const incomplete =
            !dataById.full_name ||
            !dataById.label ||
            !dataById.age ||
            !dataById.gender ||
            !dataById.contact_number;

          setNeedsProfileSetup(incomplete);
          setProfileLoading(false);
          return;
        }

        // wait before retry
        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, 800));
        }
      }

      // after retry, still no profile = needs setup
      if (!mounted) return;
      setNeedsProfileSetup(true);
      setProfileLoading(false);
    };

    checkProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator id="Root" screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : needsProfileSetup ? (
          <Stack.Screen name="ProfileSetup" component={RegisterScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
