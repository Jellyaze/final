import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getConversations, subscribeToConversations } from '../../services/messageService';
import type { Conversation } from '../../types/message.types';
import { colors } from '../../constants/Colors';
import { getRelativeTime } from '../../utils/formatDate';
import { supabase } from '../../config/supabase';

export default function MessageListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  

  const [userMap, setUserMap] = useState<Record<string, { full_name: string | null; photo_url: string | null; profile_image_url: string | null }>>({});

  useEffect(() => {
  if (user) {
    loadConversations();

    const channel = subscribeToConversations(user.id, () => {
      loadConversations();
    });

    return () => {
      channel.unsubscribe();
    };
  }
}, [user]);

  const loadUserProfiles = async (items: Conversation[]) => {
    try {
      if (!user) return;

      const otherIds = Array.from(
        new Set(
          items
            .map((c: any) => (c.user_low_id === user.id ? c.user_high_id : c.user_low_id))
            .filter(Boolean)
        )
      );

      if (otherIds.length === 0) return;

      const { data, error } = await supabase
        .from('app_d56ee_profiles')
        .select('auth_id, full_name, photo_url, profile_image_url')
        .in('auth_id', otherIds);

      if (error) return;

      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        map[p.auth_id] = {
          full_name: p.full_name ?? null,
          photo_url: p.photo_url ?? null,
          profile_image_url: p.profile_image_url ?? null,
        };
      });

      setUserMap(map);
    } catch (e) {}
  };

  const loadConversations = async () => {
    if (!user) return;

    const { data, error } = await getConversations(user.id);
    if (!error && data) {
      setConversations(data);
      await loadUserProfiles(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const convo: any = item;
    const otherUserId = convo.user_low_id === user?.id ? convo.user_high_id : convo.user_low_id;
    const otherProfile = otherUserId ? userMap[otherUserId] : null;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item.id,
            otherUserId,
          })
        }
        activeOpacity={0.85}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherProfile?.full_name ? otherProfile.full_name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>

        <View style={styles.conversationContent}>
          <Text style={styles.conversationName}>
            {otherProfile?.full_name || 'User'}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {(item as any).last_message || 'No messages yet'}
          </Text>
        </View>

        <Text style={styles.time}>
          {(item as any).last_message_at ? getRelativeTime((item as any).last_message_at) : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Your conversations</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No conversations</Text>
          <Text style={styles.emptyText}>Start a chat from a post to see messages here.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  listContent: {
    paddingVertical: 8,
  },

  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  conversationContent: {
    flex: 1,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  time: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginLeft: 8,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
});
