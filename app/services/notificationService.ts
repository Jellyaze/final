import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_KEY = 'dismissed_notifications';

export const getDismissedIds = async (): Promise<string[]> => {
  const data = await AsyncStorage.getItem(DISMISSED_KEY);
  return data ? JSON.parse(data) : [];
};

export const addDismissedId = async (id: string) => {
  const current = await getDismissedIds();
  const updated = [...new Set([...current, id])];
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
};

export interface Notification {
  id: string;
  user_id: string;
  type: 'claim' | 'message' | 'post_update' | 'system';
  title: string;
  message: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export const createNotification = async (
  userId: string,
  type: 'claim' | 'message' | 'post_update' | 'system',
  title: string,
  message: string,
  relatedId?: string
): Promise<{ data: Notification | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_notifications')
      .insert([
        {
          user_id: userId,
          type,
          title,
          message,
          related_id: relatedId,
        },
      ]);

    return { data: null, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getNotifications = async (userId: string): Promise<{ data: Notification[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('app_3f92f_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notification: Notification) => void,
  onDelete?: (id: string) => void
) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'app_3f92f_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'app_3f92f_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (onDelete) onDelete(payload.old.id);
      }
    )
    .subscribe();
};

export const dismissNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('app_3f92f_notifications') 
    .delete()
    .eq('id', notificationId);
  return { error };
};
