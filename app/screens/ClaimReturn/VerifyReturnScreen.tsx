import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function VerifyReturnScreen({ route, navigation }: any) {
  const { claimId } = route.params;
  const [claimCodeInput, setClaimCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const claimCode = useMemo(() => codeFromSeed(`${claimId}:claim`), [claimId]);
  const returnCode = useMemo(() => codeFromSeed(`${claimId}:return`), [claimId]);

  const handleVerify = async () => {
    if (claimCodeInput.length !== 4) {
      Alert.alert('Error', 'Please enter the 4-digit claim code');
      return;
    }

    setLoading(true);
    if (claimCodeInput !== claimCode) {
      setLoading(false);
      Alert.alert('Error', 'Invalid claim code');
      return;
    }
    setLoading(false);

    Alert.alert('Success', 'Return verified successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Return</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Enter the claimer's code to verify the return, then share your code with them.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Claimer's Code</Text>
          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              value={claimCodeInput}
              onChangeText={(text) => setClaimCodeInput(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => setClaimCodeInput('')} activeOpacity={0.7}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Return Code</Text>
          <View style={styles.generatedCodeContainer}>
            <Text style={styles.generatedCode}>{returnCode}</Text>
            <Text style={styles.timerText}>
              Share this code with the claimer to complete the return.
            </Text>
          </View>
        </View>

        <PrimaryButton
          title={loading ? 'Verifying...' : 'Verify'}
          onPress={handleVerify}
          style={styles.verifyButton}
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
    textAlign: 'center'
  },
  verifyButton: {
    marginTop: 8,
  },
});
