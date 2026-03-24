import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getNotifications, Notification, subscribeToNotifications } from '../services/notificationService';
import { Colors } from '../constants/Colors';
import { getRelativeTime } from '../utils/formatDate';
import { dismissNotification, getDismissedIds, addDismissedId } from '../services/notificationService';

export default function NotificationScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
  if (!user) return;

  const channel = subscribeToNotifications(
    user.id,
    (notification) => {
    getDismissedIds().then(dismissedIds => {
    if (!dismissedIds.includes(notification.id)) {
      setNotifications(prev => [notification, ...prev]);
    }
  });
},
    (deletedId) => {
      setNotifications(prev => prev.filter(n => n.id !== deletedId));
    }
  );

  return () => {
    channel.unsubscribe();
  };
}, [user?.id]);

  const loadNotifications = async () => {
  if (!user) return;
  
  setLoading(true);

  const { data, error } = await getNotifications(user.id);
  const dismissedIds = await getDismissedIds();

  if (!error && data) {
    const filtered = data.filter(n => !dismissedIds.includes(n.id));
    setNotifications(filtered);
  }

  setLoading(false);
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }

    if (notification.type === 'message') {
      navigation.navigate('Messages');
    } else if (notification.type === 'claim' || notification.type === 'post_update') {
      navigation.navigate('ViewPost', { postId: notification.related_id });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'claim':
        return '✅';
      case 'post_update':
        return '📢';
      default:
        return '🔔';
    }
  };

  const handleDismiss = async (id: string) => {
  // remove from UI immediately
  setNotifications(prev => prev.filter(n => n.id !== id));

  // save locally
  await addDismissedId(id);

  // optional: still try backend delete
  await dismissNotification(id);
};

  const renderNotification = ({ item }: { item: Notification }) => (
  <SwipeableNotification item={item} onDismiss={handleDismiss}>
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {getRelativeTime(item.created_at)}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  </SwipeableNotification>
);

  function SwipeableNotification({ item, onDismiss, children }: { 
  item: Notification; 
  onDismiss: (id: string) => void; 
  children: React.ReactNode 
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx < -10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -500,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(rowHeight, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
          ]).start(() => onDismiss(item.id));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={{ height: rowHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 82],
    })}}>
      <View style={swipeStyles.deleteBackground}>
        <Text style={swipeStyles.deleteText}>Remove</Text>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

  const swipeStyles = StyleSheet.create({
    deleteBackground: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '100%',
      backgroundColor: '#FF3B30',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 24,
    },
    deleteText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={loadNotifications}>
          <Text style={styles.refreshIcon}>
            <Image
              source={require('../assets/added/refresh.png')}
              style={{ width: 25, height: 25 }}
              resizeMode='contain'
            />
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            <Image
              source={require('../assets/added/notif.png')}
              style={{ width: 60, height: 60 }}
              resizeMode='contain'
            />
          </Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>You'll see notifications here when you get them</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  refreshIcon: {
    fontSize: 20,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#E8F5F3',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
