import React, { useCallback, useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableHighlight,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from "expo-image-picker";
import DropDownPicker from 'react-native-dropdown-picker';
import { useAuth } from '../../context/AuthContext';
import { uploadImage } from '../../services/authService';
import { colors } from '../../constants/Colors';
import { validateEmail, validatePassword, validatePhoneNumber, validateRequired } from '../../utils/validation';
import { supabase } from '../../config/supabase';
import GoogleAuthBootstrap from '../../components/auth/GoogleAuthBootstrap';

export default function RegisterScreen({ navigation }: any) {
  const { signUp, user, profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [frontIdImage, setFrontIdImage] = useState<string | null>(null);
  const [backIdImage, setBackIdImage] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [items, setItems] = useState([
    { label: 'Student', value: 'Student' },
    { label: 'Civilian', value: 'Civilian' },
    { label: 'Blue-collar', value: 'Blue-collar' },
    { label: 'White-collar', value: 'White-collar' },
    { label: 'Official', value: 'Official' }
  ]);


  const [open2, setOpen2] = useState(false);
  const [value2, setValue2] = useState<string | null>(null);
  const [items2, setItems2] = useState([
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' }
  ]);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false); // Aly added
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false); // Aly added

  const googleConfig = {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  };

  const googleEnabled = Boolean(
    googleConfig.androidClientId || googleConfig.iosClientId || googleConfig.clientId
  );

  const [googleRequest, setGoogleRequest] = useState<any>(null);
  const [googlePromptAsync, setGooglePromptAsync] = useState<any>(null);

  const handleGoogleReady = useCallback((request: any, promptAsync: any) => {
    setGoogleRequest(request);
    setGooglePromptAsync(() => promptAsync);
  }, []);

  const navigateToLogin = () => {
    let current: any = navigation;
    while (current) {
      const names = current.getState?.()?.routeNames ?? [];
      if (names.includes('Auth')) {
        current.navigate('Auth', { screen: 'LoginScreen' });
        return;
      }
      current = current.getParent?.();
    }
    // Fallback: if we're already inside Auth navigator
    navigation.navigate('LoginScreen');
  };

  // Aly added
  useEffect(() => {
    if (user && profile && isGoogleSignUp) {
      // Skip manual registration after Google sign-in
      setIsGoogleSignUp(false);
      navigation.replace('Main');
    }
  }, [user, profile, isGoogleSignUp, navigation]);

  const handleGoogleSignUp = async () => {
    try {
    console.log('Starting Google sign up...');
    setOauthLoading(true);
    setIsGoogleSignUp(true);

    if (!googleEnabled || !googlePromptAsync) {
      Alert.alert('Google Sign Up Unavailable', 'Google sign-up is not configured yet.');
      return;
    }

    if (!googleRequest) {
      Alert.alert('Google Sign Up Failed', 'Google auth request is not ready');
      return;
    }

    const result = await googlePromptAsync();
    if (result.type !== 'success') {
      return;
    }

    const idToken = result.params?.id_token;
    if (!idToken) {
      Alert.alert('Google Sign Up Failed', 'Missing ID token');
      return;
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    console.log('Google sign up completed, error:', error);

     if (error) {
      console.log('Google sign up error:', error);
      setIsGoogleSignUp(false);
      Alert.alert(
        'Google Sign Up Failed', 
        error.message || String(error),
        [
          {
            text: 'OK',
            onPress: () => setOauthLoading(false)
          }
        ]
      );
      return;
    }
    
    console.log('Google sign up successful');
    navigation.replace('Main');
  } catch (error: any) {
    console.error('Google sign up exception:', error);
    setIsGoogleSignUp(false);
    Alert.alert('Error', String(error));
  } finally {
    setOauthLoading(false);
  }
};

  const handleEmailSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    } 

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Password do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
  

  setLoading(true);

  const metadata = { 
    full_name: fullName, 
    label: value || null, 
    age: age ? parseInt(age) : null, 
    gender: value2 || null, 
    contact_number: contactNumber || null, 
    profile_image_url: profileImage || null, };

  const { error } = await signUp(email, password, metadata);

  setLoading(false);

  if(error) {
    Alert.alert('Sign Up Failed', error.message || 'Unable to create account');
  } else {
      Alert.alert(
        'Success',
        'Account created! Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => navigateToLogin() }]
      );
  }
};

// hanggang dito lng ako goobye bruv (～￣▽￣)～

  const numMo = (text: string) => {
    const numericValue = text.replace(/[^0-9-]/g, '');
    setContactNumber(numericValue);
  };

  const pickImage = async (setImage: (uri: string) => void) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("Permission to access gallery is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    if (isGoogleSignUp) {
      if (!validateRequired(fullName)) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }

      if (!value) {
        Alert.alert('Error', 'Please select your label');
        return;
      }

      if (!age || parseInt(age) < 1) {
        Alert.alert('Error', 'Please enter a valid age');
        return;
      }

      if (!value2) {
        Alert.alert('Error', 'Please select your gender');
        return;
      }

      if (!validatePhoneNumber(contactNumber)) {
        Alert.alert('Error', 'Please enter a valid contact number');
        return;
      }

      if (!frontIdImage || !backIdImage) {
        Alert.alert('Error', 'Please upload both front and back ID images');
        return;
      }

      setLoading(true);

      try {
        const {error} = await supabase
          .from('app_d56ee_profiles')
          .update({
            full_name: fullName,
            label: value,
            age: parseInt(age),
            contact_number: contactNumber,
            front_id_image_url: frontIdImage,
            back_id_image_url: backIdImage,
          })
          .or(`auth_id.eq.${user?.id},id.eq.${user?.id}`);

          if (error) throw error;

          Alert.alert(
            'Success',
            'Profile completed successfully!',
            [{ text: 'OK', onPress: () => navigation.replace('Main')}]
          );
      } catch (error: any) {
        Alert.alert('Update Failed', error.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateRequired(fullName)) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.message || 'Invalid password');
      return;
    }

    if (!value) {
      Alert.alert('Error', 'Please select your label');
      return;
    }

    if (!age || parseInt(age) < 1) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }

    if (!value2) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    if (!validatePhoneNumber(contactNumber)) {
      Alert.alert('Error', 'Please enter a valid contact number');
      return;
    }

    if (!profileImage || !frontIdImage || !backIdImage) {
      Alert.alert('Error', 'Please upload all required images (profile, front ID, back ID)');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp(email, password, {
        full_name: fullName,
        label: value,
        age: parseInt(age),
        gender: value2,
        contact_number: contactNumber,
        profile_image_url: '',
        front_id_image_url: '',
        back_id_image_url: '',
      });

      if (signUpError) {
        throw signUpError;
      }

      Alert.alert(
        'Success',
        'Account created successfully! Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => navigateToLogin() }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {googleEnabled && <GoogleAuthBootstrap config={googleConfig} onReady={handleGoogleReady} />}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Create Profile</Text>
          <Text style={styles.headerSubtitle}>
            {isGoogleSignUp ? 'Complete your Profile' : 'Join our community'}
          </Text>

          <View style={styles.circle}>
            <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : require("../../assets/proflogo.png")
              }
              style={styles.image}
            />
          </View>
          
          <TouchableHighlight 
          onPress={() => pickImage(setProfileImage)}
          underlayColor={colors.primarySoft}
          disabled={isGoogleSignUp && !!profileImage}
          >
            <View style={[styles.addp, isGoogleSignUp && !!profileImage && styles.addpDisabled]}>
              <Text style={[styles.addpText, isGoogleSignUp && !!profileImage && styles.addpTextDisabled]}>
                {isGoogleSignUp && profileImage ? 'Google Photo' : 'Add photo'}
              </Text>
            </View>
          </TouchableHighlight>

          <View style={styles.bastalabel}>
            <Text style={styles.labeltxt}>Email</Text>
            <TextInput
              style={[
                styles.input, 
                focusedInput === 'email' && styles.inputFocused,
                isGoogleSignUp && styles.inputDisabled
              ]}
              onChangeText={setEmail}
              value={email}
              placeholder="Enter your email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />

          {!isGoogleSignUp && (
            <>
            <Text style={styles.labeltxt}>Password</Text>
            <TextInput
              style={[styles.input, focusedInput === 'password' && styles.inputFocused]}
              onChangeText={setPassword}
              value={password}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />

            <Text style={styles.labeltxt}>Confirm Password</Text>
            <TextInput
              style={[styles.input, focusedInput === 'confirmPassword' && styles.inputFocused]}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              onFocus={() => setFocusedInput('confirmPassword')}
              onBlur={() => setFocusedInput(null)}
            />
            </>
          )}

            <Text style={styles.labeltxt}>Label</Text>
            <View style={styles.dpb}>
              <DropDownPicker
                style={styles.dp1}
                open={open}
                value={value}
                items={items}
                setOpen={setOpen}
                setValue={setValue}
                setItems={setItems}
                listMode="SCROLLVIEW"
                placeholder="Select your label"
                placeholderStyle={{ color: colors.textMuted }}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>

            <Text style={styles.labeltxt}>Name</Text>
            <TextInput
              style={[styles.input, focusedInput === 'name' && styles.inputFocused]}
              onChangeText={setFullName}
              value={fullName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
            />

            <View style={styles.aggentxt}>
              <Text style={styles.labeltxt}>Age</Text>
              <Text style={styles.labeltxt}>Gender</Text>
            </View>

            <View style={styles.aggen}>
              <View style={styles.agItem}>
                <TextInput
                  style={[styles.inputSmall, focusedInput === 'age' && styles.inputFocused]}
                  keyboardType="numeric"
                  onChangeText={setAge}
                  value={age}
                  placeholder="Age"
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => setFocusedInput('age')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              <View style={styles.agItem}>
                <DropDownPicker
                  style={styles.dpSmall}
                  open={open2}
                  value={value2}
                  items={items2}
                  setOpen={setOpen2}
                  setValue={setValue2}
                  setItems={setItems2}
                  listMode="SCROLLVIEW"
                  placeholder="Select"
                  placeholderStyle={{ color: colors.textMuted }}
                  dropDownContainerStyle={styles.dropdownContainer}
                />
              </View>
            </View>

            <Text style={styles.labeltxt}>Contact no.</Text>
            <TextInput
              style={[styles.input, focusedInput === 'contact' && styles.inputFocused]}
              keyboardType="numeric"
              onChangeText={numMo}
              value={contactNumber}
              placeholder="Enter contact number"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setFocusedInput('contact')}
              onBlur={() => setFocusedInput(null)}
            />

            <View style={styles.idencss}>
              <View style={styles.idenitem}>
                <Text style={styles.identxt}>Front ID</Text>
                <Image
                  source={
                    frontIdImage
                      ? { uri: frontIdImage }
                      : require("../../assets/idenlogo.png")
                  }
                  style={styles.idenp}
                />
                <TouchableHighlight onPress={() => pickImage(setFrontIdImage)} underlayColor={colors.primarySoft}>
                  <View style={styles.addpSmall}>
                    <Text style={styles.addpSmallText}>Add photo</Text>
                  </View>
                </TouchableHighlight>
              </View>

              <View style={styles.idenitem}>
                <Text style={styles.identxt}>Back ID</Text>
                <Image
                  source={
                    backIdImage
                      ? { uri: backIdImage }
                      : require("../../assets/idenlogo.png")
                  }
                  style={styles.idenp}
                />
                <TouchableHighlight onPress={() => pickImage(setBackIdImage)} underlayColor={colors.primarySoft}>
                  <View style={styles.addpSmall}>
                    <Text style={styles.addpSmallText}>Add photo</Text>
                  </View>
                </TouchableHighlight>
              </View>
            </View>
          </View>

          <TouchableHighlight
            onPress={handleRegister}
            underlayColor={colors.primaryDark}
            disabled={loading}
            style={[styles.createbtn, loading && styles.createbtnDisabled]}
          >
            <View style={styles.createbtnInner}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createbtnText}>
                  {isGoogleSignUp ? 'COMPLETE PROFILE' : 'CREATE ACCOUNT'}
                </Text>
              )}
            </View>
          </TouchableHighlight>

          <TouchableHighlight
            onPress={async () => {
              if (user || isGoogleSignUp) {
                await supabase.auth.signOut();
                setIsGoogleSignUp(false);
                return;
              }
              navigateToLogin();
            }}
            underlayColor="transparent"
          >
            <View style={styles.loginLink}>
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
              </Text>
            </View>
          </TouchableHighlight>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '500',
  },

  circle: {
    marginTop: 4,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: "cover",
  },

  addp: {
    alignItems: 'center',
    width: 140,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: colors.background,
  },
  addpText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  addpDisabled: {
    opacity: 0.5,
  },
  addpTextDisabled: {
    color: colors.textMuted,
  },

  bastalabel: {
    backgroundColor: colors.surface,
    width: 340,
    borderRadius: 16,
    marginTop: 20,
    paddingBottom: 20,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  labeltxt: {
    marginTop: 10,
    marginLeft: 24,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },

  dp1: {
    width: '100%',
    zIndex: 2000,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: colors.background,
    minHeight: 52,
  },
  dpb: {
    width: 292,
    alignSelf: 'center',
    marginTop: 8,
  },
  dropdownContainer: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  input: {
    height: 52,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 16,
    width: 292,
    backgroundColor: colors.background,
    alignSelf: 'center',
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 8,
  },
  inputSmall: {
    height: 52,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 16,
    width: '100%',
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  aggentxt: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: 292,
    marginLeft: 24,
    marginTop: 6,
    gap: 120,
  },
  aggen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: 292,
    marginTop: 10,
    gap: 12,
  },
  agItem: {
    flex: 1,
  },

  dpSmall: {
    width: '100%',
    minHeight: 52,
    zIndex: 1000,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: colors.background,
  },

  idencss: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: 292,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idenp: {
    height: 190,
    width: 120,
    resizeMode: "cover",
    borderRadius: 10,
  },
  identxt: {
    alignSelf: 'center',
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  idenitem: {
    margin: 10,
    alignItems: 'center',
  },

  addpSmall: {
    alignItems: 'center',
    width: 120,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: colors.background,
  },
  addpSmallText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },

  createbtn: {
    width: 300,
    borderRadius: 12,
    marginTop: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createbtnInner: {
    height: 56,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createbtnDisabled: {
    opacity: 0.6,
  },
  createbtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },

  loginLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  loginLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: colors.textMuted,
  },
});
