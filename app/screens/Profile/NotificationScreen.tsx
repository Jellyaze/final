import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import {useAuth} from '../../context/AuthContext';
import { supabase } from '../../config/supabase';

export default function NotificationSettingsScreen({ navigation }: any) {
  const auth = useAuth() as any;
  const { user } = auth;

  const [messageEmail, setMessageEmail] = useState<boolean>(true);
  const [messagePhone, setMessagePhone] = useState<boolean>(true);
  const [postsEmail, setPostsEmail] = useState<boolean>(true);
  const [postsPhone, setPostsPhone] = useState<boolean>(false);
  const [claimEmail, setClaimEmail] = useState<boolean>(true);
  const [claimPhone, setClaimPhone] = useState<boolean>(true);

  const loadSettings = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('app_d56ee_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return;

      if (data) {
        setMessageEmail(!!data.message_email);
        setMessagePhone(!!data.message_phone);
        setPostsEmail(!!data.posts_email);
        setPostsPhone(!!data.posts_phone);
        setClaimEmail(!!data.claim_email);
        setClaimPhone(!!data.claim_phone);
      } else {
        await supabase.from('app_d56ee_notification_settings').insert({
          user_id: user.id,
          message_email: messageEmail,
          message_phone: messagePhone,
          posts_email: postsEmail,
          posts_phone: postsPhone,
          claim_email: claimEmail,
          claim_phone: claimPhone,
        });
      }
    } catch (e) {}
  };

  const saveSettings = async (updates: any) => {
    try {
      if (!user?.id) return;

      await supabase
        .from('app_d56ee_notification_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        });
    } catch (e) {}
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message notifications</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>On Email</Text>
            <Switch
              value={messageEmail}
              onValueChange={(val: boolean) => {
                setMessageEmail(val);
                saveSettings({ message_email: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={messageEmail ? Colors.primary : Colors.gray}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>On Phone</Text>
            <Switch
              value={messagePhone}
              onValueChange={(val: boolean) => {
                setMessagePhone(val);
                saveSettings({ message_phone: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={messagePhone ? Colors.primary : Colors.gray}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relevant Posts</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>On Email</Text>
            <Switch
              value={postsEmail}
              onValueChange={(val: boolean) => {
                setPostsEmail(val);
                saveSettings({ posts_email: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={postsEmail ? Colors.primary : Colors.gray}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>On Phone</Text>
            <Switch
              value={postsPhone}
              onValueChange={(val: boolean) => {
                setPostsPhone(val);
                saveSettings({ posts_phone: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={postsPhone ? Colors.primary : Colors.gray}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Return / Claim Confirmation</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>On Email</Text>
            <Switch
              value={claimEmail}
              onValueChange={(val: boolean) => {
                setClaimEmail(val);
                saveSettings({ claim_email: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={claimEmail ? Colors.primary : Colors.gray}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>On Phone</Text>
            <Switch
              value={claimPhone}
              onValueChange={(val: boolean) => {
                setClaimPhone(val);
                saveSettings({ claim_phone: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={claimPhone ? Colors.primary : Colors.gray}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  backButton: {
    fontSize: 16,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.text.primary,
  },
});
