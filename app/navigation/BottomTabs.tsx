import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';
import HomeScreen from '../screens/Home/HomeScreen';
import MyPostsScreen from '../screens/Posts/MyPostsScreen';
import MessageListScreen from '../screens/Messaging/MessageListScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { BottomTabParamList } from './types';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id="BottomTabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom || 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../assets/homelogo.png')}
              style={[styles.icon, focused && styles.iconFocused]}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MyPosts"
        component={MyPostsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../assets/storyplogo.png')}
              style={[styles.icon, focused && styles.iconFocused]}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessageListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../assets/messlogo.png')}
              style={[styles.icon, focused && styles.iconFocused]}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../assets/added/notif.png')}
              style={[{width: 23, length: 23}, focused && styles.iconFocused]}
              resizeMode='contain'
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../assets/taologo.png')}
              style={[styles.icon, focused && styles.iconFocused]}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingBottom: 3,
    paddingTop: 3
  },
  icon: {
    width: 30,
    height: 30,
  },
  iconFocused: {
    tintColor: Colors.primary,
  },
});
