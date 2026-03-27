import { supabase } from '../config/supabase';
import { createNotification } from './notificationService';
import { Message, Conversation, GroupChat, GroupMember, TypingIndicator, MessageType } from '../types/message.types';
import { uploadImage, uploadFile } from './uploadService';

export const createConversation = async (
  postId: string,
  user1Id: string,
  user2Id: string
): Promise<{ data: Conversation | null; error: any }> => {
  try {
    const userLowId = user1Id < user2Id ? user1Id : user2Id;
    const userHighId = user1Id < user2Id ? user2Id : user1Id;

    const { data: existing, error: existingErr } = await supabase
      .from('app_3f92f_conversations')
      .select('*')
      .or(
        `and(user_low_id.eq.${userLowId},user_high_id.eq.${userHighId})`
      )
      .maybeSingle();

    if (existingErr) {
      console.error('createConversation existing check error:', existingErr);
      return { data: null, error: existingErr };
    }
    if (existing) return { data: existing as Conversation, error: null };

    const { data, error } = await supabase
      .from('app_3f92f_conversations')
      .insert([
        {
          post_id: postId,
          user1_id: user1Id,
          user2_id: user2Id,
          user_low_id: userLowId,
          user_high_id: userHighId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('createConversation insert error:', error);

      if ((error as any)?.code === '23505') {
        const { data: dupe, error: dupeErr } = await supabase
          .from('app_3f92f_conversations')
          .select('*')
          .eq('user_low_id', userLowId)
          .eq('user_high_id', userHighId)
          .maybeSingle();

        if (!dupeErr && dupe) {
          return { data: dupe as Conversation, error: null };
        }
      }
    }

    if (!error && !data) {
      const { data: fallback, error: fallbackErr } = await supabase
        .from('app_3f92f_conversations')
        .select('*')
        .eq('user_low_id', userLowId)
        .eq('user_high_id', userHighId)
        .maybeSingle();

      if (!fallbackErr && fallback) {
        return { data: fallback as Conversation, error: null };
      }
    }

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getConversations = async (userId: string): Promise<{ data: Conversation[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('app_3f92f_conversations')
      .select('*')
      .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`)
      .is('deleted_at', null) // filter out deleted
      .order('last_message_at', { ascending: false });

    // If deleted_at doesn't exist yet, fall back to unfiltered query
    if (error && /column.*deleted_at/i.test(error.message || '')) {
      const { data: fallback, error: fallbackErr } = await supabase
        .from('app_3f92f_conversations')
        .select('*')
        .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });
      return { data: fallback || [], error: fallbackErr };
    }

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  messageType: MessageType = 'text',
  fileUrl?: string,
  fileName?: string,
  fileSize?: number,
  replyToMessageId?: string
): Promise<{ data: Message | null; error: any }> => {
  try {
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      is_read: false,
    };

    if (fileUrl) messageData.file_url = fileUrl;
    if (fileName) messageData.file_name = fileName;
    if (fileSize) messageData.file_size = fileSize;
    if (replyToMessageId) messageData.reply_to_message_id = replyToMessageId;

    const { data, error } = await supabase
      .from('app_3f92f_messages')
      .insert([messageData])
      .select()
      .single();

    if (!error) {
      const lastMessage = messageType === 'text' ? content :
        messageType === 'image' ? '📷 Image' :
          '📎 File';

      await supabase
        .from('app_3f92f_conversations')
        .update({
          last_message: lastMessage,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (messageType !== 'system') {
        const { data: convo } = await supabase
          .from('app_3f92f_conversations')
          .select('user1_id,user2_id,user_low_id,user_high_id')
          .eq('id', conversationId)
          .maybeSingle();

        const otherUserId =
          convo?.user1_id && convo?.user2_id
            ? (convo.user1_id === senderId ? convo.user2_id : convo.user1_id)
            : convo?.user_low_id && convo?.user_high_id
              ? (convo.user_low_id === senderId ? convo.user_high_id : convo.user_low_id)
              : null;

        if (otherUserId) {
          const { error: notifyError } = await createNotification(
            otherUserId,
            'message',
            'New message',
            messageType === 'text' ? content : lastMessage,
            conversationId
          );

          if (notifyError) {
            console.error('Notification insert error:', notifyError);
          }
        } else {
          console.warn('Notification skipped: could not resolve other user', {
            conversationId,
            senderId,
          });
        }
      }
    }

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const sendImageMessage = async (
  conversationId: string,
  senderId: string,
  imageUri: string,
  caption: string = ''
): Promise<{ data: Message | null; error: any }> => {
  try {
    const uploadResult = await uploadImage(imageUri, senderId, conversationId);

    if (uploadResult.error || !uploadResult.url) {
      return { data: null, error: uploadResult.error || 'Upload failed' };
    }

    return await sendMessage(
      conversationId,
      senderId,
      caption,
      'image',
      uploadResult.url,
      uploadResult.path.split('/').pop(),
      undefined
    );
  } catch (error) {
    return { data: null, error };
  }
};

export const sendFileMessage = async (
  conversationId: string,
  senderId: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<{ data: Message | null; error: any }> => {
  try {
    const uploadResult = await uploadFile(fileUri, fileName, mimeType, senderId, conversationId);

    if (uploadResult.error || !uploadResult.url) {
      return { data: null, error: uploadResult.error || 'Upload failed' };
    }

    return await sendMessage(
      conversationId,
      senderId,
      fileName,
      'file',
      uploadResult.url,
      fileName,
      fileSize
    );
  } catch (error) {
    return { data: null, error };
  }
};

export const getMessages = async (
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: Message[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('app_3f92f_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const editMessage = async (
  messageId: string,
  newContent: string
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_messages')
      .update({
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const deleteMessage = async (messageId: string, userId?: string): Promise<{ error: any }> => {
  try {
    const query = supabase
      .from('app_3f92f_messages')
      .delete()
      .eq('id', messageId);

    if (userId) {
      query.eq('sender_id', userId);
    }

    const { error } = await query;

    return { error };
  } catch (error) {
    return { error };
  }
};

export const searchMessages = async (
  conversationId: string,
  searchQuery: string
): Promise<{ data: Message[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('app_3f92f_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .ilike('content', `%${searchQuery}%`)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

// ==================== READ RECEIPTS ====================

export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const getUnreadCount = async (
  conversationId: string,
  userId: string
): Promise<{ count: number; error: any }> => {
  try {
    const { count, error } = await supabase
      .from('app_3f92f_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    return { count: count || 0, error };
  } catch (error) {
    return { count: 0, error };
  }
};

// ==================== TYPING INDICATORS ====================

export const setTypingIndicator = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      });

    return { error };
  } catch (error) {
    return { error };
  }
};

export const subscribeToTypingIndicators = (
  conversationId: string,
  currentUserId: string,
  callback: (isTyping: boolean, userId: string) => void
) => {
  return supabase
    .channel(`typing:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_3f92f_typing_indicators',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const typingData = payload.new as TypingIndicator;
        if (typingData.user_id !== currentUserId) {
          callback(typingData.is_typing, typingData.user_id);
        }
      }
    )
    .subscribe();
};

// ==================== REALTIME SUBSCRIPTIONS ====================

export const subscribeToMessages = (
  conversationId: string,
  callback: (message: Message) => void
) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'app_3f92f_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();
};

// ==================== GROUP CHATS ====================

export const createGroupChat = async (
  name: string,
  description: string,
  createdBy: string,
  memberIds: string[]
): Promise<{ data: GroupChat | null; error: any }> => {
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('app_3f92f_group_chats')
      .insert([
        {
          name,
          description,
          created_by: createdBy,
        },
      ])
      .select()
      .single();

    if (groupError || !groupData) {
      return { data: null, error: groupError };
    }

    const members = [
      {
        group_id: groupData.id,
        user_id: createdBy,
        role: 'admin',
      },
      ...memberIds.map(userId => ({
        group_id: groupData.id,
        user_id: userId,
        role: 'member',
      })),
    ];

    const { error: membersError } = await supabase
      .from('app_3f92f_group_members')
      .insert(members);

    if (membersError) {
      return { data: null, error: membersError };
    }

    return { data: groupData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getGroupChats = async (userId: string): Promise<{ data: GroupChat[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('app_3f92f_group_members')
      .select(`
        group_id,
        app_3f92f_group_chats (*)
      `)
      .eq('user_id', userId);

    if (error) return { data: [], error };

    const groups = data?.map((item: any) => item.app_3f92f_group_chats).filter(Boolean) || [];
    return { data: groups, error: null };
  } catch (error) {
    return { data: [], error };
  }
};

export const getGroupMembers = async (groupId: string): Promise<{ data: GroupMember[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('app_3f92f_group_members')
      .select('*')
      .eq('group_id', groupId);

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const addGroupMember = async (
  groupId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_group_members')
      .insert([
        {
          group_id: groupId,
          user_id: userId,
          role,
        },
      ]);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const removeGroupMember = async (
  groupId: string,
  userId: string
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const updateGroupChat = async (
  groupId: string,
  updates: { name?: string; description?: string; avatar_url?: string }
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('app_3f92f_group_chats')
      .update(updates)
      .eq('id', groupId);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const deleteGroupChat = async (groupId: string): Promise<{ error: any }> => {
  try {
    await supabase
      .from('app_3f92f_group_members')
      .delete()
      .eq('group_id', groupId);

    const { error } = await supabase
      .from('app_3f92f_group_chats')
      .delete()
      .eq('id', groupId);

    return { error };
  } catch (error) {
    return { error };
  }
};

// delete convo

export const deleteConversationForMe = async (conversationId: string, userId: string) => {
  const { error } = await supabase
    .from('app_3f92f_conversations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', conversationId)
    .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`);
  return { error };
};

export const deleteConversationForEveryone = async (conversationId: string) => {
  const { error } = await supabase
    .from('app_3f92f_messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (error) return { error };

  const { error: convError } = await supabase
    .from('app_3f92f_conversations')
    .delete()
    .eq('id', conversationId);

  return { error: convError };
};

export const subscribeToConversations = (
  userId: string,
  callback: () => void
) => {
  return supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_3f92f_conversations',
        filter: `user_low_id=eq.${userId}`,
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_3f92f_conversations',
        filter: `user_high_id=eq.${userId}`,
      },
      () => callback()
    )
    .subscribe();
};
