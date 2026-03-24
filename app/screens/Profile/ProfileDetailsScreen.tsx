import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Image, TouchableOpacity, Alert, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function ProfileDetailsScreen({ navigation }: any) {
  const auth = useAuth() as any;
  const { user, profile, updateProfile } = auth;

  const [loading, setLoading] = useState(false);

  const [profileImage, setProfileImage] = useState<string | null>(profile?.profile_image_url || null);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [contactNumber, setContactNumber] = useState(profile?.contact_number || '');

  const [labelOpen, setLabelOpen] = useState(false);
  const [label, setLabel] = useState<string | null>(profile?.label || null);
  const [labelItems, setLabelItems] = useState([
    { label: 'Student', value: 'Student' },
    { label: 'Civilian', value: 'Civilian' },
    { label: 'Blue-collar', value: 'Blue-collar' },
    { label: 'White-collar', value: 'White-collar' },
    { label: 'Official', value: 'Official' },
  ]);

  const [genderOpen, setGenderOpen] = useState(false);
  const [gender, setGender] = useState<string | null>(profile?.gender || null);
  const [genderItems] = useState([
    { label: 'Female', value: 'Female' },
    { label: 'Male', value: 'Male' },
    { label: 'Prefer not to say', value: 'Prefer not to say' },
    { label: 'Other', value: 'Other' },
  ]);

  const [idFrontImage, setIdFrontImage] = useState<string | null>(profile?.front_id_image_url || null);
  const [idBackImage, setIdBackImage] = useState<string | null>(profile?.back_id_image_url || null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const pickIdImage = async (type: 'front' | 'back') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (type === 'front') setIdFrontImage(uri);
      if (type === 'back') setIdBackImage(uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!label) {
      Alert.alert('Error', 'Please select your role');
      return;
    }

    if (!age || parseInt(age) < 1) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }

    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    if (!contactNumber.trim()) {
      Alert.alert('Error', 'Please enter your contact number');
      return;
    }

    if (!idFrontImage || !idBackImage) {
      Alert.alert('Error', 'Please upload both Front and Back ID photos');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Not logged in');
      return;
    }

    setLoading(true);

    const { error } = await updateProfile({
      full_name: fullName.trim(),
      label,
      age: parseInt(age),
      gender,
      contact_number: contactNumber.trim(),
      profile_image_url: profileImage,
      front_id_image_url: idFrontImage,
      back_id_image_url: idBackImage,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to update profile');
    } else {
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 10 : 20 }
        ]}>
        <View style={styles.profileImageContainer}>
          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : require('../../assets/proflogo.png')
            }
            style={styles.profileImage}
          />
        </View>

        <TouchableOpacity onPress={pickImage} style={styles.replacePhotoButton}>
          <Text style={styles.replacePhotoText}>Replace Photo</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Label / Role</Text>
          <View style={styles.dropdownWrapper}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              open={labelOpen}
              value={label}
              items={labelItems}
              setOpen={setLabelOpen}
              setValue={setLabel}
              onChangeValue={(value) => {
                setLabel(value);
              }}
              placeholder="Select Role"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              maxHeight={250}
            />
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full Name"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.dropdownWrapper}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              open={genderOpen}
              value={gender}
              items={genderItems}
              setOpen={setGenderOpen}
              setValue={setGender}
              onChangeValue={(value) => {
                setGender(value);
              }}
              placeholder="Select Gender"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              maxHeight={170}
            />
          </View>

          <Text style={styles.label}>Contact No.</Text>
          <TextInput
            style={styles.input}
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="Contact Number"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Identification</Text>
          <View style={styles.idImagesContainer}>
            <View style={styles.idImageWrapper}>
              <Text style={styles.idLabel}>Front</Text>
              <TouchableOpacity style={styles.idImageBox} onPress={() => pickIdImage('front')}>
                <Image
                  source={
                    idFrontImage
                      ? { uri: idFrontImage }
                      : require('../../assets/adaptive-icon.png')
                  }
                  style={styles.idImage}
                />
                <View style={styles.idOverlay}>
                  <Text style={styles.idImagePlaceholder}>Replace photo</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.idImageWrapper}>
              <Text style={styles.idLabel}>Back</Text>
              <TouchableOpacity style={styles.idImageBox} onPress={() => pickIdImage('back')}>
                <Image
                  source={
                    idBackImage
                      ? { uri: idBackImage }
                      : require('../../assets/adaptive-icon.png')
                  }
                  style={styles.idImage}
                />
                <View style={styles.idOverlay}>
                  <Text style={styles.idImagePlaceholder}>Replace photo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton
            title="Save"
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:
  {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton:
  {
    fontSize: 16,
    color: Colors.primary
  },
  headerTitle:
  {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 15,
  },
  idImagesContainer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  idImageWrapper: {
    flex: 1,
  },
  idLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  idImageBox: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    overflow: 'hidden'
  },
  idImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  idImagePlaceholder: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  idOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  replacePhotoButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 10,
    marginBottom: 30,
  },
  replacePhotoText:
  {
    color: Colors.primary,
    fontWeight: 'bold'
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    marginTop: 15
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: Colors.white
  },
  saveButton: {
    marginTop: 30
  },
  dropdownWrapper: {
    zIndex: 1000,
    marginBottom: 10
  },
  dropdown: {
    borderColor: Colors.border,
    minHeight: 50,
    paddingHorizontal: 12
  },
  dropdownContainer: {
    borderColor: Colors.border
  },

});
