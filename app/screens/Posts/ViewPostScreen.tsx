import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../context/AuthContext';
import { getPostById, deletePost, Post } from '../../services/postService';
import { createClaim } from '../../services/claimService';
import { createConversation } from '../../services/messageService';
import { Colors } from '../../constants/Colors';
import { formatDate, formatTime } from '../../utils/formatDate';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { supabase } from '../../config/supabase';

const { width } = Dimensions.get('window');

export default function ViewPostScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const { user } = useAuth() as any;

  const [post, setPost] = useState<Post | null>(null);

  const [posterProfile, setPosterProfile] = useState<any>(null);
  const [claimerProfile, setClaimerProfile] = useState<any>(null);
  const [claimRow, setClaimRow] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);

    const { data, error } = await getPostById(postId);

    if (!error && data) {
      setPost(data);

      const { data: poster, error: posterErr } = await supabase
        .from('app_d56ee_profiles')
        .select('*')
        .eq('auth_id', data.user_id)
        .maybeSingle();

      if (!posterErr) setPosterProfile(poster);

      if (user?.id && user.id === data.user_id) {
        const { data: claim, error: claimErr } = await supabase
          .from('app_d56ee_claims')
          .select('*')
          .eq('post_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!claimErr && claim) {
          setClaimRow(claim);

          const { data: claimer, error: claimerErr } = await supabase
            .from('app_d56ee_profiles')
            .select('*')
            .eq('auth_id', claim.claimer_id)
            .maybeSingle();

          if (!claimerErr) setClaimerProfile(claimer);
        } else {
          setClaimRow(null);
          setClaimerProfile(null);
        }
      } else {
        setClaimRow(null);
        setClaimerProfile(null);
      }
    }

    setLoading(false);
  };

  const handleClaim = async () => {
    if (!user || !post) return;

    Alert.alert('Confirm claim', 'Are you sure you want to claim this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setActionLoading(true);
          const { data, error } = await createClaim(post.id, user.id, post.user_id);
          setActionLoading(false);

          if (error) {
            Alert.alert('Error', 'Failed to create claim');
          } else if (data?.id) {
            Alert.alert('Success', 'Claim submitted successfully!', [
              {
                text: 'Continue',
                onPress: () =>
                  navigation.navigate('ConfirmClaim', {
                    postId: post.id,
                    claimId: data.id,
                  }),
              },
            ]);
          } else {
            Alert.alert('Success', 'Claim submitted successfully!');
          }
        },
      },
    ]);
  };

  const handleMessage = async () => {
    if (!user || !post) return;

    setActionLoading(true);
    if (user.id === post.user_id) {
      Alert.alert('Error', 'You cannot message yourself');
      setActionLoading(false);
      return;
    }

    const { data, error } = await createConversation(post.id, user.id, post.user_id);
    setActionLoading(false);

    if (!error && data) {
      navigation.navigate('Chat', {
        conversationId: data.id,
        otherUserId: post.user_id,
      });
    } else {
      const debugInfo = JSON.stringify({
        error: error || null,
        hasData: !!data,
        userId: user.id,
        otherUserId: post.user_id,
      });
      Alert.alert('Error', `Failed to start conversation\n\n${debugInfo}`);
    }
  };

  const handleDelete = () => {
    Alert.alert('Confirmation', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!post) return;
          setActionLoading(true);
          const { error } = await deletePost(post.id);
          setActionLoading(false);

          if (error) {
            Alert.alert('Error', 'Failed to delete post');
          } else {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleReport = () => {
    Alert.alert('Report', 'Report functionality coming soon');
  };

  const handleVerifyReturn = () => {
    if (!claimRow?.id) {
      Alert.alert('No claim found', 'There is no active claim to verify yet.');
      return;
    }

    navigation.navigate('VerifyReturn', { claimId: claimRow.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  const isOwner = user?.id === post.user_id;

  const latitude = typeof post.latitude === 'string' ? Number(post.latitude) : post.latitude;
  const longitude = typeof post.longitude === 'string' ? Number(post.longitude) : post.longitude;
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{post.title}</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Options', '', [
              { text: 'Delete', onPress: handleDelete, style: 'destructive' },
              { text: 'Report', onPress: handleReport },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        >
          <Text style={styles.moreButton}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.imageContainer}>
          {post.image_urls && post.image_urls.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {post.image_urls.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.image} />
              ))}
            </ScrollView>
          ) : (
            <Image source={require('../../assets/lostitem.png')} style={styles.image} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={[styles.badge, post.type === 'lost' ? styles.lostBadge : styles.foundBadge]}>
              <Text style={styles.badgeText}>{post.type === 'lost' ? 'Lost' : 'Found'}</Text>
            </View>
          </View>

          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.posterInfo}>
            <Text style={styles.posterName}>
              {posterProfile?.full_name || posterProfile?.name || 'Unknown user'}
            </Text>

            {!!posterProfile?.label && (
              <Text style={{ fontSize: 14, color: Colors.text.secondary, marginBottom: 4 }}>
                {posterProfile.label}
              </Text>
            )}

            {!!post?.created_at && (
              <Text style={styles.posterDate}>{formatDate(post.created_at)}</Text>
            )}
          </View>

          {isOwner && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Claimer Information</Text>

              {claimRow && claimerProfile ? (
                <View style={[styles.posterInfo, { borderWidth: 1, borderColor: Colors.primary }]}>
                  <Text style={styles.posterName}>
                    {claimerProfile?.full_name || claimerProfile?.name || 'Unknown'}
                  </Text>

                  {!!claimerProfile?.gender && (
                    <Text style={styles.posterDate}>Gender: {claimerProfile.gender}</Text>
                  )}

                  {!!claimerProfile?.age && (
                    <Text style={styles.posterDate}>Age: {claimerProfile.age}</Text>
                  )}

                  {!!claimerProfile?.label && (
                    <Text style={styles.posterDate}>{claimerProfile.label}</Text>
                  )}

                  {!!claimerProfile?.contact_number && (
                    <Text style={styles.posterDate}>Contact: {claimerProfile.contact_number}</Text>
                  )}

                  {!!claimRow?.status && (
                    <Text style={[styles.posterDate, { marginTop: 6 }]}>
                      Claim Status: {claimRow.status}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.posterInfo}>
                  <Text style={styles.posterDate}>No one has claimed this post yet.</Text>
                </View>
              )}

              {claimRow && (
                <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyReturn}>
                  <Text style={styles.verifyButtonText}>Verify return</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>
              {post.type === 'lost' ? 'Last seen in' : 'Last found in'}
            </Text>
            <Text style={styles.locationText}>{post.location_name}</Text>
            <View style={styles.mapContainer}>
              {hasCoords ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  maxZoomLevel={18}
                  minZoomLevel={11}
                >
                  <Marker
                    coordinate={{ latitude, longitude }}
                    title={post.title || 'Location'}
                    description={post.location_name}
                    pinColor={Colors.primary}
                  />
                </MapView>
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.mapFallbackText}>Map unavailable</Text>
                  <Text style={styles.mapFallbackSubtext}>Missing or invalid coordinates</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>
              {post.breed ? 'Pet' : 'Item'}: {post.category}
              </Text>
            </View>

            {post.breed && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Breed</Text>
              <Text style={styles.infoValue}>{post.breed}</Text>
            </View>
            )}
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {post.type === 'lost' ? 'Date last seen' : 'Date Found'}
              </Text>
              <Text style={styles.infoValue}>{formatDate(post.date_lost_found)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {post.type === 'lost' ? 'Time last seen' : 'Time found'}
              </Text>
              <Text style={styles.infoValue}>{formatTime(post.date_lost_found)}</Text>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={styles.description}>{post.description}</Text>
          </View>

          <View style={styles.claimingSection}>
            <Text style={styles.sectionTitle}>Claiming Method/s</Text>
            <Text style={styles.description}>
              Claiming method: {post.claiming_method || 'Not specified'}
            </Text>
          </View>

          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {post.tags.map((tag: any, index: any) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!isOwner && (
            <View style={styles.actions}>
              <PrimaryButton
                title="Confirm claim"
                onPress={handleClaim}
                loading={actionLoading}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="Contact"
                onPress={handleMessage}
                loading={actionLoading}
                style={[styles.actionButton, styles.secondaryButton]}
              />
            </View>
          )}
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
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  moreButton: {
    fontSize: 24,
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
  imageContainer: {
    height: 300,
    backgroundColor: Colors.lightGray,
  },
  image: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  lostBadge: {
    backgroundColor: Colors.error,
  },
  foundBadge: {
    backgroundColor: Colors.success,
  },
  badgeText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.text.primary,
  },
  posterInfo: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  posterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  posterDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  mapSection: {
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  mapContainer: {
    height: 250,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.lightGray,
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mapFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  mapFallbackSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  infoGrid: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  claimingSection: {
    marginBottom: 20,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tagText: {
    color: Colors.white,
    fontSize: 12,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    marginVertical: 5,
  },
  secondaryButton: {
    backgroundColor: '#163560',
    borderWidth: 2,
    borderColor: '#163560',
    fontWeight: 'bold'
  },
  verifyButton: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
