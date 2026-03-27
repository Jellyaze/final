import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { User, Session, Provider } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

WebBrowser.maybeCompleteAuthSession();

interface UserMetadata {
  full_name?: string;
  label?: string;
  age?: number;
  gender?: string;
  contact_number?: string;
  profile_image_url?: string;
  front_id_image_url?: string;
  back_id_image_url?: string;
}

interface ProfileRow {
  photo_url: string;
  id: string;
  full_name: string | null;
  label: string | null;
  age: number | null;
  gender: string | null;
  contact_number: string | null;
  profile_image_url: string | null;
  front_id_image_url: string | null;
  back_id_image_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileRow | null;

  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, metadata: UserMetadata) => Promise<{ error: any | null }>;

  signInWithGoogle: () => Promise<{ error: any | null }>;
  // Fb, Apple, etc. removed (lagay nalang if needed)
  updateProfile: (updates: Partial<ProfileRow>) => Promise<{ error: any | null }>;

  signOut: () => Promise<void>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  profile: null,

  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),

  signInWithGoogle: async () => ({ error: null }),
  // same here for Fb, Apple, etc.
  updateProfile: async () => ({ error: null }),

  signOut: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

const ensureProfileRow = async (user: User) => {
  const { data: existingByAuth, error: selectAuthError } = await supabase
    .from('app_d56ee_profiles')
    .select('id')
    .eq('auth_id', user.id)
    .limit(1)
    .maybeSingle();

  if (selectAuthError) {
    console.error('Error checking profile (auth_id):', selectAuthError);
    return;
  }

  if (existingByAuth) return;

  const { data: existingById, error: selectIdError } = await supabase
    .from('app_d56ee_profiles')
    .select('id')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  if (selectIdError) {
    console.error('Error checking profile (id):', selectIdError);
    return;
  }

  if (existingById) return;

  const full_name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.display_name as string) ||
    '';

  const profile_image_url =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    '';

  const { error: insertError } = await supabase.from('app_d56ee_profiles').insert({
    id: user.id,
    auth_id: user.id,
    full_name,
    label: null,
    age: null,
    gender: null,
    contact_number: null,
    profile_image_url,
    front_id_image_url: null,
    back_id_image_url: null,
  });

  if (insertError) {
    console.error('Error creating profile for OAuth user:', insertError);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    // expo-notifications setup (error talaga kung wala to, pero goods na)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });


    // notification received in foreground
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // notification response
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('User tapped notification:', data);
    });

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  }, []);

  const fetchProfile = async (uid?: string | null) => {
  if (!uid) {
    setProfile(null);
    return;
  }

  const { data, error } = await supabase
    .from('app_d56ee_profiles')
    .select('*')
    .eq('auth_id', uid)
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    setProfile(data ?? null);
    return;
  }

  if (error) {
    console.error('Error fetching profile (auth_id):', error);
  }

  const { data: dataById, error: errorById } = await supabase
    .from('app_d56ee_profiles')
    .select('*')
    .eq('id', uid)
    .limit(1)
    .maybeSingle();

  if (errorById) {
    console.error('Error fetching profile (id):', errorById);
    return;
  }

  setProfile(dataById ?? null);
};


  const uploadImageToSupabase = async (fileUri: string, path: string) => {
    try {
      const res = await fetch(fileUri);
      const arrayBuffer = await res.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('app_d56ee_images')
        .upload(path, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        return { error: uploadError, publicUrl: null };
      }

      const { data } = supabase.storage.from('app_d56ee_images').getPublicUrl(path);
      return { error: null, publicUrl: data.publicUrl };
    } catch (error: any) {
      return { error, publicUrl: null };
    }
  };

  const registerForPushNotifications = async (uid: string) => {
    try {
      if (!uid) return;

      if (!Device.isDevice) {
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      // Notification channel for Android "default"
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8f7e7e7c',
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '5c3f199d-882a-4317-bbda-424b83ef3227',
      });

      const expoPushToken = tokenData.data;

      if (!expoPushToken) return;

      await supabase.from('app_d56ee_push_tokens').upsert({
        user_id: uid,
        expo_push_token: expoPushToken,
        device: `${Device.brand ?? ''} ${Device.modelName ?? ''}`.trim(),
      });
    } catch (e) {
      console.error('Push notif register error:', e);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      if (!mounted) return;

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth getSession error:', error);
          // Clear stale refresh tokens that can break app launch
          if (String(error.message || error).toLowerCase().includes('refresh token')) {
            await supabase.auth.signOut();
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const session = data?.session ?? null;

        if (session) {
          const refreshToken = (session as any)?.refresh_token;
          const accessToken = (session as any)?.access_token;

          if (refreshToken && !accessToken) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await ensureProfileRow(session.user);
          await fetchProfile(session.user.id);
          await registerForPushNotifications(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Auth init error:', err);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      try {
        if (_event === 'TOKEN_REFRESH_FAILED') {
          console.error('Token refresh failed; signing out to clear stale session');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session) {
          const refreshToken = (session as any)?.refresh_token;
          const accessToken = (session as any)?.access_token;

          if (refreshToken && !accessToken) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await ensureProfileRow(session.user);
          await fetchProfile(session.user.id);
          await registerForPushNotifications(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Auth state change error:', err);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, metadata: UserMetadata) => {
    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'seeker',
        path: 'auth',
        // Use Expo proxy in dev (Expo Go) to make OAuth redirects work reliably.
        useProxy: __DEV__,
      });
      //added scheme and path

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectTo,
        },
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase.from('app_d56ee_profiles').insert({
          id: data.user.id,
          auth_id: data.user.id,
          full_name: metadata.full_name ?? '',
          label: metadata.label ?? null,
          age: metadata.age ?? null,
          gender: metadata.gender ?? null,
          contact_number: metadata.contact_number ?? null,
          profile_image_url: metadata.profile_image_url ?? null,
          front_id_image_url: metadata.front_id_image_url ?? null,
          back_id_image_url: metadata.back_id_image_url ?? null,
        });

        if (profileError) console.error('Error creating profile:', profileError);
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    try {
      console.log(`Starting ${provider} OAuth...`);
      
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'seeker',
        path: 'auth',
        // Use Expo proxy in dev (Expo Go) to make OAuth redirects work reliably.
        useProxy: __DEV__,
      });
      console.log('Redirect URL:', redirectTo);
      //same here, added scheme and path

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.log('OAuth error:', error)
        return { error };
      }
      if (!data?.url) {
        console.log('Missing OAuth URL');
        return { error: new Error('Missing OAuth URL') };
      }
      console.log('Opening OAuth URL...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      console.log('OAuth result:', result);

      if (result.type === 'cancel') {
        console.log('User cancelled OAuth');
        return { error: new Error('OAuth cancelled by user') };
      }

      if (result.type !== 'success') {
        console.log('OAuth failed:', result.type);
        return { error: new Error('OAuth cancelled') };
      }

      const url = result.url;
      console.log('Callback URL:', url);

      // Let supabase parse the URL and set the session (handles code + implicit flows)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl({
        url,
        storeSession: true,
      });

      if (sessionError) {
        console.log('Session parse error:', sessionError);
        return { error: sessionError };
      }

      if (!sessionData?.session) {
        console.log('No session returned from OAuth callback');
        return { error: new Error('No session returned from OAuth callback') };
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signInWithGoogle = async () => signInWithOAuth('google');
  //didn't remove the function for  apple sign in 
  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      return { error: new Error('Apple Sign-In is iOS only') };
    }
    return signInWithOAuth('apple');
  };

  const updateProfile = async (updates: Partial<ProfileRow>) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) return { error: userError };

      const currentUser = userData?.user;
      if (!currentUser) return { error: new Error('No user logged in') };

      const nextUpdates: any = { ...updates };

      if (typeof nextUpdates.profile_image_url === 'string' && nextUpdates.profile_image_url.startsWith('file://')) {
        const path = `${currentUser.id}/profile.jpg`;
        const { error: uploadError, publicUrl } = await uploadImageToSupabase(nextUpdates.profile_image_url, path);
        if (uploadError || !publicUrl) return { error: uploadError || new Error('Failed to upload profile image') };
        nextUpdates.profile_image_url = publicUrl;
      }

      if (typeof nextUpdates.front_id_image_url === 'string' && nextUpdates.front_id_image_url.startsWith('file://')) {
        const path = `${currentUser.id}/id_front.jpg`;
        const { error: uploadError, publicUrl } = await uploadImageToSupabase(nextUpdates.front_id_image_url, path);
        if (uploadError || !publicUrl) return { error: uploadError || new Error('Failed to upload front ID image') };
        nextUpdates.front_id_image_url = publicUrl;
      }

      if (typeof nextUpdates.back_id_image_url === 'string' && nextUpdates.back_id_image_url.startsWith('file://')) {
        const path = `${currentUser.id}/id_back.jpg`;
        const { error: uploadError, publicUrl } = await uploadImageToSupabase(nextUpdates.back_id_image_url, path);
        if (uploadError || !publicUrl) return { error: uploadError || new Error('Failed to upload back ID image') };
        nextUpdates.back_id_image_url = publicUrl;
      }

      const { error } = await supabase
        .from('app_d56ee_profiles')
        .update({
          ...nextUpdates,
        })
        .or(`auth_id.eq.${currentUser.id},id.eq.${currentUser.id}`);

      if (!error) {
        await fetchProfile(currentUser.id);
      }

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      fetchProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value: AuthContextType = {
    user: user,
    session,
    loading,
    profile,

    signIn,
    signUp,

    signInWithGoogle,
    // signInWithApple, and fb Deleted for now, but can be added back if needed
    updateProfile,

    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
