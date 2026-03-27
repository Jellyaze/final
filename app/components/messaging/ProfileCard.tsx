import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../constants/Colors';

interface ProfileCardProps {
  data: {
    full_name: string;
    gender: string;
    age: string | number;
    contact_number: string;
    photo_url?: string | null;
    role?: string;
  };
}

export default function ProfileCard({ data }: ProfileCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        {data.photo_url ? (
          <Image source={{ uri: data.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>
              {data.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        {data.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{data.role}</Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        <Text style={styles.name}>{data.full_name}</Text>
        <Text style={styles.detail}>
          <Text style={styles.label}>Gender: </Text>
          {data.gender}
        </Text>
        <Text style={styles.detail}>
          <Text style={styles.label}>Age: </Text>
          {data.age}
        </Text>
        <Text style={styles.detail}>
          <Text style={styles.label}>Contact no: </Text>
          {data.contact_number}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#F0FAF7',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 12,
    maxWidth: 260,
    alignItems: 'center',
    marginRight: 2
  },
  left: {
    marginRight: 12,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '700',
    color: 'colors.primary',
  },
  right: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: '#141414',
    marginBottom: 2,
  },
  label: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  roleBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});