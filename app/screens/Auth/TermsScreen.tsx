import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/Colors';

export default function TermsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>📄 Last Updated: March 21, 2026</Text>

        <Text style={styles.intro}>
          Welcome to Seeker. By downloading, installing, or using the Seeker mobile application, you agree to be bound by these Terms and Conditions. Please read them carefully before using the app.
        </Text>

        {[
          {
            num: '01', title: 'Acceptance of Terms',
            body: 'By accessing or using Seeker, you confirm that you are at least 13 years of age, have read and understood these Terms, and agree to be legally bound by them. If you do not agree to these Terms, you must not use the application.\n\nWe reserve the right to update or modify these Terms at any time. Continued use of the app after changes are posted constitutes your acceptance of the revised Terms.',
          },
          {
            num: '02', title: 'Description of Service',
            body: 'Seeker is a Lost-and-Found monitoring system designed for the community of Olongapo City. The app allows users to report lost items, report found items, claim items by submitting a claim request, and message other users to coordinate the return of lost belongings.\n\nSeeker acts solely as a platform connecting users. We do not take physical possession of any items and are not responsible for the actual exchange or return of lost property.',
          },
          {
            num: '03', title: 'User Accounts and Responsibilities',
            body: 'To use Seeker\'s features, you may be required to create an account. You are responsible for providing accurate and truthful information, maintaining the confidentiality of your account credentials, all activity that occurs under your account, and notifying us immediately of any unauthorized use.\n\nWe reserve the right to suspend or terminate accounts that violate these Terms.',
          },
          {
            num: '04', title: 'Acceptable Use',
            body: 'You agree to use Seeker only for lawful purposes. You must not post false or fraudulent reports, attempt to claim items that do not belong to you, harass other users, use the app to facilitate theft or fraud, upload offensive content, or attempt to gain unauthorized access to any part of the app.',
          },
          {
            num: '05', title: 'Item Reports and Claims',
            body: 'When submitting a lost or found report, you agree to provide accurate descriptions, locations, and images. Seeker does not guarantee the successful return of any reported item. We encourage users to exercise caution when meeting others and to do so in safe, public locations.\n\nSeeker is not liable for any disputes arising between users regarding the ownership or return of items.',
          },
          {
            num: '06', title: 'Messaging and Communications',
            body: 'The in-app messaging feature is provided to facilitate coordination between users. You agree to use this feature respectfully and only for its intended purpose.\n\nSeeker does not monitor private messages but reserves the right to review communications if a violation is reported. Abuse of the messaging system may result in account suspension.',
          },
          {
            num: '07', title: 'Privacy and Data',
            body: 'Your use of Seeker is also governed by our Privacy Policy. By using the app, you consent to the collection and use of your information as described in the Privacy Policy.',
          },
          {
            num: '08', title: 'Intellectual Property',
            body: 'All content, design, logos, and features of the Seeker application are the intellectual property of the Seeker development team. You may not reproduce, distribute, or create derivative works without prior written permission.',
          },
          {
            num: '09', title: 'Disclaimers and Limitation of Liability',
            body: 'Seeker is provided on an "as is" basis without warranties of any kind. To the fullest extent permitted by law, Seeker and its developers shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app.',
          },
          {
            num: '10', title: 'Governing Law',
            body: 'These Terms shall be governed by the laws of the Republic of the Philippines. Any disputes shall be subject to the exclusive jurisdiction of the courts of Olongapo City.',
          },
          {
            num: '11', title: 'Changes to These Terms',
            body: 'We may revise these Terms from time to time. When we make significant changes, we will notify users through the app. The date at the top of this page reflects the most recent update.',
          },
        ].map((section) => (
          <View key={section.num} style={styles.section}>
            <Text style={styles.sectionNum}>{section.num}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Questions or Concerns?</Text>
          <Text style={styles.contactText}>If you have any questions about these Terms and Conditions, please reach out to us.</Text>
        </View>

        <Text style={styles.footer}>© 2025 Seeker. All rights reserved. · Olongapo City, Philippines</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { marginRight: 12 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  date: {
    fontSize: 13,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  intro: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  contactBox: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  contactTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  contactText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  footer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
});