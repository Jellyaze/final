import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/Colors';
import PrimaryButton from '../../components/ui/PrimaryButton';

const codeFromSeed = (seed: string) => {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  const num = Math.abs(hash) % 10000;
  return num.toString().padStart(4, '0');
};

export default function ConfirmClaimScreen({ route, navigation }: any) {
  const { claimId } = route.params;
  const [claimImage, setClaimImage] = useState<string | null>(null);
  const [returnCodeInput, setReturnCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const claimCode = useMemo(() => codeFromSeed(`${claimId}:claim`), [claimId]);
  const returnCode = useMemo(() => codeFromSeed(`${claimId}:return`), [claimId]);

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
      setClaimImage(result.assets[0].uri);
    }
  };

  const handleComplete = async () => {
    if (!claimImage) {
      Alert.alert('Error', 'Please upload an image of the item');
      return;
    }

    if (returnCodeInput.length !== 4) {
      Alert.alert('Error', 'Please enter the 4-digit return code');
      return;
    }

    setLoading(true);
    if (returnCodeInput !== returnCode) {
      setLoading(false);
      Alert.alert('Error', 'Invalid return code');
      return;
    }
    setLoading(false);

    Alert.alert('Success', 'Claim confirmed successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Claim</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Upload a clear photo of the item, then enter the owner's code to complete the claim.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Image</Text>
          <TouchableOpacity style={styles.imageUpload} onPress={pickImage} activeOpacity={0.85}>
            {claimImage ? (
              <Image source={{ uri: claimImage }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadIcon}>+</Text>
                <Text style={styles.uploadText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Return Code (from owner)</Text>
          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              value={returnCodeInput}
              onChangeText={(text) => setReturnCodeInput(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => setReturnCodeInput('')} activeOpacity={0.7}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Claim Code</Text>
          <View style={styles.generatedCodeContainer}>
            <Text style={styles.generatedCode}>{claimCode}</Text>
            <Text style={styles.timerText}>
              Share this code with the owner to verify your claim.
            </Text>
          </View>
        </View>

        <PrimaryButton
          title={loading ? 'Verifying...' : 'Complete'}
          onPress={handleComplete}
          style={styles.completeButton}
          disabled={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 18,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  imageUpload: {
    width: '100%',
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  uploadIcon: {
    fontSize: 42,
    color: colors.primary,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
    marginRight: 10,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  clearButton: {
    color: colors.accent,
    fontWeight: '700',
  },
  generatedCodeContainer: {
    alignItems: 'center',
  },
  generatedCode: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 10,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  completeButton: {
    marginTop: 8,
  },
});
