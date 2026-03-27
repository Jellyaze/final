import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/Colors';

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>📄 Last Updated: March 21, 2026</Text>

        {[
          {
            num: '01', title: 'Introduction',
            body: 'This Privacy Policy explains how Seeker collects, uses, and protects your personal information when you use the application.',
          },
          {
            num: '02', title: 'Information We Collect',
            body: '• Name, email, age, and phone number\n• Email account\n• Device and usage data\n• Location data (with permission)\n• Images from your camera or gallery',
          },
          {
            num: '03', title: 'How We Use Your Information',
            body: '• To provide and maintain the app\n• To manage your account\n• To communicate updates and notifications\n• To improve user experience',
          },
          {
            num: '04', title: 'Sharing of Information',
            body: 'We may share your data with service providers, or when required by law. We do not sell your personal information.',
          },
          {
            num: '05', title: 'Data Retention',
            body: 'Your data is stored only as long as necessary for service functionality, legal compliance, and dispute resolution.',
          },
          {
            num: '06', title: 'Your Rights',
            body: 'You may access, update, or delete your personal data anytime through your account or by contacting us.',
          },
          {
            num: '07', title: 'Security',
            body: 'We use reasonable security measures to protect your data but cannot guarantee complete security.',
          },
          {
            num: '08', title: 'Changes to Policy',
            body: 'We may update this Privacy Policy. Changes will be posted here.',
          },
        ].map((section) => (
          <View key={section.num} style={styles.section}>
            <Text style={styles.sectionNum}>{section.num}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactText}>If you have questions about this Privacy Policy, contact us.</Text>
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