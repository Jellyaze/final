import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
  Keyboard,
  Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import {
  getMessages,
  sendMessage,
  sendImageMessage,
  sendFileMessage,
  markMessagesAsRead,
  subscribeToMessages,
  editMessage,
  deleteMessage,
  setTypingIndicator,
  subscribeToTypingIndicators,
} from '../../services/messageService';
import { Message } from '../../types/message.types';
import { colors } from '../../constants/Colors';
import MessageBubble from '../../components/messaging/MessageBubble';
import TypingIndicator from '../../components/messaging/TypingIndicator';
import ImagePickerModal from '../../components/messaging/ImagePickerModal';
import { getFileSize } from '../../services/uploadService';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import { deleteConversationForMe, deleteConversationForEveryone } from '../../services/messageService';

export default function ChatScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { conversationId, otherUserId } = route.params;
  const { user } = useAuth() as any;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [idModalVisible, setIdModalVisible] = useState(false);
  const [idProfile, setIdProfile] = useState<{ front_id_image_url?: string; back_id_image_url?: string } | null>(null);
  const [otherProfile, setOtherProfile] = useState<{ full_name?: string | null; photo_url?: string | null; profile_image_url?: string | null } | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardWillShow = Keyboard.addListener(
      showEvent,
      (e) => {
        setKeyboardHeight(e.endCoordinates.height + insets.bottom);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardHeight(0);
      }
    );

    const keyboardDidChangeFrame = Keyboard.addListener('keyboardDidChangeFrame', (e) => {
      if (e.endCoordinates.height > 0) {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      keyboardDidChangeFrame.remove();
    };
  }, []);

  useEffect(() => {
    loadMessages();
    markAsRead();
    loadOtherProfile();

    const messageChannel = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      if (newMessage.sender_id !== user?.id) {
        markAsRead();
      }
    });

    const typingChannel = subscribeToTypingIndicators(
      conversationId,
      user?.id || '',
      (typing) => {
        setIsTyping(typing);
      }
    );

    return () => {
      messageChannel.unsubscribe();
      typingChannel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  const loadOtherProfile = async () => {
    if (!otherUserId) return;
    const { data, error } = await supabase
      .from('app_d56ee_profiles')
      .select('full_name, photo_url, profile_image_url')
      .eq('auth_id', otherUserId)
      .maybeSingle();
    if (!error) {
      setOtherProfile(data || null);
    }
  };

  const loadMessages = async () => {
    const { data, error } = await getMessages(conversationId);
    if (!error && data) {
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
  };

  const markAsRead = async () => {
    if (user) {
      await markMessagesAsRead(conversationId, user.id);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (user) {
      setTypingIndicator(conversationId, user.id, text.length > 0);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingIndicator(conversationId, user.id, false);
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    setLoading(true);

    if (editingMessageId) {
      const { error } = await editMessage(editingMessageId, inputText.trim());
      if (error) {
        Alert.alert('Error', 'Failed to edit message');
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === editingMessageId
              ? { ...msg, content: inputText.trim(), is_edited: true }
              : msg
          )
        );
        setEditingMessageId(null);
      }
    } else {
      const { error } = await sendMessage(conversationId, user.id, inputText.trim());
      if (error) {
        Alert.alert('Error', 'Failed to send message');
      }
    }

    setLoading(false);
    setInputText('');
    setTypingIndicator(conversationId, user.id, false);
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  const handleImageSelected = async (uri: string) => {
    if (!user) return;

    setLoading(true);
    const { error } = await sendImageMessage(conversationId, user.id, uri);
    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to send image');
    } else {
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const file = result.assets[0];
      const fileSize = await getFileSize(file.uri);

      if (fileSize > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File size must be less than 10MB');
        return;
      }

      if (!user) return;

      setLoading(true);
      const { error } = await sendFileMessage(
        conversationId,
        user.id,
        file.uri,
        file.name,
        file.mimeType || 'application/octet-stream',
        fileSize
      );
      setLoading(false);

      if (error) {
        Alert.alert('Error', 'Failed to send file');
      } else {
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    } catch (error) {
      console.error('File picker error:', error);
    }
  };

  const handleMessageLongPress = (message: Message) => {
    if (message.sender_id !== user?.id) return;

    try {
    const parsed = JSON.parse(message.content);
    if (parsed.type === 'profile_card') return;
  } catch {}

    Alert.alert(
      'Message Options',
      '',
      [
        {
          text: 'Edit',
          onPress: () => {
            if (message.message_type === 'text') {
              setInputText(message.content);
              setEditingMessageId(message.id);
            } else {
              Alert.alert('Info', 'Only text messages can be edited');
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Message',
              'Are you sure you want to delete this message?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    const { error } = await deleteMessage(message.id, user?.id);
                    if (!error) {
                      setMessages(prev => prev.filter(m => m.id !== message.id));
                    } else {
                      Alert.alert('Error', 'Failed to delete message');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleImagePress = (url: string) => {
    setSelectedImageUrl(url);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;

    return (
      <MessageBubble
        message={item}
        isMyMessage={isMyMessage}
        onLongPress={() => handleMessageLongPress(item)}
        onImagePress={handleImagePress}
      />
    );
  };

  const handleSendID = async () => {
  if (!user) return;

  try {
    const { data: profile, error } = await supabase
      .from('app_d56ee_profiles')
      .select(`
        full_name,
        gender,
        age,
        contact_number,
        photo_url,
        profile_image_url,
        front_id_image_url,
        back_id_image_url
      `)
      .eq('auth_id', user.id)
      .maybeSingle();

    if (error) { 
      Alert.alert('Error', error.message); 
      return; 
    }

    if (!profile) { 
      Alert.alert('Error', 'Profile not found.'); 
      return; 
    }

    setIdProfile(profile);
    setIdModalVisible(true);

    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to retrieve profile');
    }
  };

  const sendStoredID = async (idUrl: string, side: 'front' | 'back') => {
    Alert.alert(
      'Confirm',
      `Are you sure you want to send your ${side} ID? This will be visible to the other person.`,
      [
        { text: 'Cancel', style: 'cancel'},
        {
          text: 'Send',
          onPress: async () => {
            setLoading(true);

            const { error } = await sendMessage(
              conversationId,
              user.id,
              side === 'front' ? 'Front ID' : 'Back ID',
              'image',
              idUrl,
              side === 'front' ? 'id_front.jpg' : 'id_back.jpg'
            );

            setLoading(false);

            if (error) {
              Alert.alert('Error', 'Failed to send ID');
            } else {
              setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
              Alert.alert('Success', 'ID sent successfully');
            }
          },
        },
      ]
    );
  };

  const sendBothIDs = async (frontUrl: string, backUrl: string) => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to send both front and back ID? These will be visible to the other person',
      [
        { text: 'Cancel', style: 'cancel'},
        {
          text: 'Send Both',
          onPress: async () => {
            setLoading(true);

            const { error: frontError } = await sendMessage(
              conversationId,
              user.id,
              'Front ID',
              'image',
              frontUrl,
              'id_front.jpg'
            );

            if (!frontError) {
              await sendMessage(
                conversationId,
                user.id,
                'Back ID',
                'image',
                backUrl,
                'id_back.jpg'
              );
            }

            setLoading(false);

            if(frontError) {
              Alert.alert('Error', 'Failed to send IDs');
            }else{
              setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
              Alert.alert('Success', 'Both IDs sent successfully');
            }
          },
        },
      ]
    );
  };

  const pickIDFromGallery = async () => {
    try{
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

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      Alert.alert(
        'Send ID',
        'Are you sure you want to send this ID image?',
        [
          {
            text: 'Send',
            onPress: async () => {
              setLoading(true);
              const { error } = await sendImageMessage(conversationId, user.id, uri);
              setLoading(false);

              if(error) {
                Alert.alert('Error', 'Failed to send ID');
              } else {
                setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
                Alert.alert('Success', 'ID sent successfully');
              }
            },

          },
        ]
      );
    } catch (error) {
      console.error('ID picker error:', error);
    }
  };

  const sendProfileCard = async () => {
  if (!user || !idProfile) return;

  console.log('Profile data:', JSON.stringify(idProfile, null, 2));
  const profileCardContent = JSON.stringify({
    type: 'profile_card',
    full_name: (idProfile as any).full_name || 'Unknown',
    gender: (idProfile as any).gender || 'N/A',
    age: (idProfile as any).age || 'N/A',
    contact_number: (idProfile as any).contact_number || 'N/A',
    photo_url: (idProfile as any).profile_image_url || (idProfile as any).photo_url || null,
    role: (idProfile as any).role || 'Student',
  });

  Alert.alert(
    'Send Profile Card',
    'Are you sure you want to share your profile information?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setLoading(true);
          const { error } = await sendMessage(
            conversationId,
            user.id,
            profileCardContent,
            'text',
          );
          setLoading(false);

          if (error) {
            Alert.alert('Error', 'Failed to send profile card');
          } else {
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
          }
        },
      },
    ]
  );
};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            {otherProfile?.profile_image_url || otherProfile?.photo_url ? (
              <Image
                source={{ uri: (otherProfile.profile_image_url || otherProfile.photo_url) as string }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {otherProfile?.full_name
                  ? otherProfile.full_name.charAt(0).toUpperCase()
                  : otherUserId
                  ? otherUserId.charAt(0).toUpperCase()
                  : 'U'}
              </Text>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{otherProfile?.full_name || 'Chat'}</Text>
            <Text style={styles.headerSubtitle}>
              {otherProfile?.full_name ? 'Active conversation' : `User ${otherUserId.substring(0, 8)}`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
            onPress={() => setDeleteModalVisible(true)}
            style={styles.moreButton}
            activeOpacity={0.7}
          >
            <Text style={styles.moreButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <View 
        style={[styles.content, {flex: 1}]}
        >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          // contentContainerStyle={[
          // styles.messagesList,
          // { paddingBottom: keyboardHeight }
          // ]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          showsVerticalScrollIndicator={false}
        />

        {editingMessageId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingText}>Editing message</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingMessageId(null);
                setInputText('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelEdit}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[
          styles.inputContainer, 
          { 
            marginBottom: keyboardHeight > 0 
            ? keyboardHeight
            : insets.bottom
          }]}>

          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setImagePickerVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.attachIcon}>
              <Image
                source={require('../../assets/added/img-attach.png')}
                style={{ width: 25, height: 25 }}
                resizeMode='contain'
              />
            </Text> 
          </TouchableOpacity> 

          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleSendID}
            activeOpacity={0.8}
          >
            <Text style={styles.attachIcon}>
              <Image
                source={require('../../assets/added/info-attach.png')}
                style={{ width: 25, height: 25 }}
                resizeMode='contain'
              />
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            <Image
              source={editingMessageId 
                ? require('../../assets/added/check.png') 
                : require('../../assets/added/send.png')
              }
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onImageSelected={handleImageSelected}
      />

      <Modal
        visible={!!selectedImageUrl}
        transparent
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <TouchableOpacity
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImageUrl(null)}
        >
          <Image
            source={{ uri: selectedImageUrl || '' }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
      {/* Delete Chat Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Chat</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose how you want to delete this conversation.
            </Text>

            {/* Delete for me */}
            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.8}
              onPress={async () => {
                setDeleteModalVisible(false);
                const { error } = await deleteConversationForMe(conversationId, user.id);
                if (error) {
                  Alert.alert('Error', 'Failed to delete chat.');
                } else {
                  navigation.goBack();
                }
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Text style={styles.modalOptionEmoji}>
                  <Image 
                  source={require('../../assets/added/delete.png')}
                  style={{ width: 20, height: 20 }}
                  resizeMode='contain'
                  />
                </Text>
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Delete for me</Text>
                <Text style={styles.modalOptionDesc}>
                  Only you will no longer see this conversation.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete for everyone */}
            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionDanger]}
              activeOpacity={0.8}
              onPress={async () => {
                setDeleteModalVisible(false);
                const { error } = await deleteConversationForEveryone(conversationId);
                if (error) {
                  Alert.alert('Error', 'Failed to delete chat for everyone.');
                } else {
                  navigation.goBack();
                }
              }}
            >
              <View style={[styles.modalOptionIcon, styles.modalOptionIconDanger]}>
                <Text style={styles.modalOptionEmoji}>
                  <Image 
                    source={require('../../assets/added/remove.png')}
                    style={{ width: 20, height: 20 }}
                    resizeMode='contain'
                  />
                </Text>
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, styles.modalOptionTitleDanger]}>
                  Delete for everyone
                </Text>
                <Text style={styles.modalOptionDesc}>
                  This chat will be permanently deleted for both users.
                </Text>
              </View>
            </TouchableOpacity>
              
            {/* Cancel */}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setDeleteModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Send ID Modal */}
      <Modal
        visible={idModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIdModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIdModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send ID</Text>
              <TouchableOpacity onPress={() => setIdModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose which to send. This will be visible to the other person.
            </Text>

            {/* Front ID */}
            {idProfile?.front_id_image_url && (
              <TouchableOpacity
                style={styles.modalOption}
                activeOpacity={0.8}
                onPress={() => {
                  setIdModalVisible(false);
                  sendStoredID(idProfile.front_id_image_url!, 'front');
                }}
              >
                <View style={styles.modalOptionIcon}>
                  <Text style={styles.modalOptionEmoji}>
                    <Image
                      source={require('../../assets/added/front-id.png')}
                      style={{ width: 25, height: 25 }}
                      resizeMode='contain'
                    />
                  </Text>
                </View>
                <View style={styles.modalOptionText}>
                  <Text style={styles.modalOptionTitle}>Send Front ID</Text>
                  <Text style={styles.modalOptionDesc}>Send the front side of your ID.</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Back ID */}
            {idProfile?.back_id_image_url && (
              <TouchableOpacity
                style={styles.modalOption}
                activeOpacity={0.8}
                onPress={() => {
                  setIdModalVisible(false);
                  sendStoredID(idProfile.back_id_image_url!, 'back');
                }}
              >
                <View style={styles.modalOptionIcon}>
                  <Text style={styles.modalOptionEmoji}>
                    <Image
                      source={require('../../assets/added/back-id.png')}
                      style={{ width: 25, height: 25 }}
                      resizeMode='contain'
                    />
                  </Text>
                </View>
                <View style={styles.modalOptionText}>
                  <Text style={styles.modalOptionTitle}>Send Back ID</Text>
                  <Text style={styles.modalOptionDesc}>Send the back side of your ID.</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Send Both */}
            {idProfile?.front_id_image_url && idProfile?.back_id_image_url && (
              <TouchableOpacity
                style={styles.modalOption}
                activeOpacity={0.8}
                onPress={() => {
                  setIdModalVisible(false);
                  sendBothIDs(idProfile.front_id_image_url!, idProfile.back_id_image_url!);
                }}
              >
                <View style={styles.modalOptionIcon}>
                  <Text style={styles.modalOptionEmoji}>
                    <Image
                      source={require('../../assets/added/both.png')}
                      style={{ width: 25, height: 25 }}
                      resizeMode='contain'
                    />
                  </Text>
                </View>
                <View style={styles.modalOptionText}>
                  <Text style={styles.modalOptionTitle}>Send Both</Text>
                  <Text style={styles.modalOptionDesc}>Send both front and back ID at once.</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.8}
              onPress={() => {
                setIdModalVisible(false);
                sendProfileCard();
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Image
                  source={require('../../assets/added/info-attach.png')}
                  style={{ width: 25, height: 25 }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Send Profile Card</Text>
                <Text style={styles.modalOptionDesc}>
                  Share your basic profile information.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setIdModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarText: { fontSize: 20 },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: { fontSize: 20, color: colors.textPrimary },

  content: { flex: 1 },
  messagesList: { flexGrow: 1 },

  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  editingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cancelEdit: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12, 
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachIcon: { fontSize: 18 },

  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 110,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },

  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: { width: '100%', height: '100%' },

  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
modalCard: {
  backgroundColor: colors.surface,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  paddingBottom: 40,
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: colors.textPrimary,
},
modalClose: {
  fontSize: 16,
  color: colors.textSecondary,
  fontWeight: '600',
},
modalSubtitle: {
  fontSize: 13,
  color: colors.textSecondary,
  marginBottom: 20,
},
modalOption: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.background,
  borderRadius: 14,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: colors.border,
},
modalOptionDanger: {
  borderColor: '#FF3B3020',
  backgroundColor: '#FF3B3008',
},
modalOptionIcon: {
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: colors.primarySoft,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 14,
},
modalOptionIconDanger: {
  backgroundColor: '#FF3B3015',
},
modalOptionEmoji: {
  fontSize: 20,
},
modalOptionText: {
  flex: 1,
},
modalOptionTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: colors.textPrimary,
  marginBottom: 2,
},
modalOptionTitleDanger: {
  color: '#FF3B30',
},
modalOptionDesc: {
  fontSize: 12,
  color: colors.textSecondary,
  lineHeight: 16,
},
modalCancel: {
  marginTop: 4,
  alignItems: 'center',
  paddingVertical: 14,
  borderRadius: 14,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
},
modalCancelText: {
  fontSize: 15,
  fontWeight: '600',
  color: colors.textSecondary,
},
});

