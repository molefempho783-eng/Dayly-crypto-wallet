import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  collection,
  getDocs,
  collectionGroup,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList, Community } from "../../types";
import { db, auth, storage } from "../../firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import createStyles, {
  SPACING,
  BOTTOM_TAB_BAR_HEIGHT,
  FONT_SIZES,
} from "../context/appStyles";

const DEFAULT_COMMUNITY_LOGO = require("../../assets/community-placeholder.png");

type CommunityDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CommunityDetailScreen"
>;
type CommunityDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "CommunityDetailScreen"
>;

const CommunityDetailScreen = () => {
  const route = useRoute<CommunityDetailScreenRouteProp>();
  const { community } = route.params;

  const [communityData, setCommunityData] = useState<Community>(community);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [isMember, setIsMember] = useState(false);
  const [groupChats, setGroupChats] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigation = useNavigation<CommunityDetailScreenNavigationProp>();

  const { colors } = useTheme();
  const styles = createStyles(colors).communityDetailScreen;
  const globalStyles = createStyles(colors).global;

  const isCreator = !!uid && communityData.createdBy === uid;

  // Track auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  // Load full community doc
  const fetchFullCommunityData = useCallback(async () => {
    try {
      const communityDocRef = doc(db, "communities", community.id);
      const communitySnap = await getDoc(communityDocRef);
      if (communitySnap.exists()) {
        setCommunityData({
          ...(communitySnap.data() as Community),
          id: communitySnap.id,
        });
      }
    } catch (error: any) {
      console.error("Error fetching full community data:", error);
    }
  }, [community.id]);

  // Check membership from users/{uid}.joinedCommunities
  const checkMembership = useCallback(async () => {
    if (!uid) return;
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const joinedCommunities: string[] =
          (userSnap.data() as any).joinedCommunities || [];
        setIsMember(joinedCommunities.includes(community.id));
      } else {
        setIsMember(false);
      }
    } catch (error: any) {
      console.error("Error checking membership:", error);
    }
  }, [uid, community.id]);

  // Robust group chat fetcher (supports multiple schemas)
  const fetchGroupChats = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Preferred: /communities/{id}/groupChats
      let groups: { id: string; name: string }[] = [];
      try {
        const snap1 = await getDocs(
          collection(db, "communities", community.id, "groupChats")
        );
        groups = snap1.docs.map((d) => {
          const data: any = d.data();
          return { id: d.id, name: data.name || data.title || "Untitled" };
        });
      } catch (e) {
        // ignore, fall through to other shapes
      }

      // 2) If none, collectionGroup('groupChats') filtered by communityId
      if (groups.length === 0) {
        try {
          const q2 = query(
            collectionGroup(db, "groupChats"),
            where("communityId", "==", community.id)
          );
          const snap2 = await getDocs(q2);
          groups = snap2.docs.map((d) => {
            const data: any = d.data();
            return { id: d.id, name: data.name || data.title || "Untitled" };
          });
        } catch (e) {
          // ignore
        }
      }

      // 3) If still none, top-level /chats with communityId
      if (groups.length === 0) {
        try {
          const q3 = query(
            collection(db, "chats"),
            where("communityId", "==", community.id)
          );
          const snap3 = await getDocs(q3);
          groups = snap3.docs.map((d) => {
            const data: any = d.data();
            return { id: d.id, name: data.name || data.title || "Untitled" };
          });
        } catch (e) {
          // ignore
        }
      }

      setGroupChats(groups);
    } catch (error: any) {
      if (error?.code === "permission-denied") {
        console.warn(
          "You do not have permission to access group chats. Check rules."
        );
      } else {
        console.error("Error fetching group chats:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [community.id]);

  // Initial load / refetch when uid or community changes
  useEffect(() => {
    fetchFullCommunityData();
    checkMembership();
    fetchGroupChats();
  }, [uid, community.id, fetchFullCommunityData, checkMembership, fetchGroupChats]);

  const handleJoinCommunity = async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to join a community.");
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, { joinedCommunities: [community.id] });
      } else {
        await updateDoc(userRef, {
          joinedCommunities: arrayUnion(community.id),
        });
      }

      setIsMember(true);
      Alert.alert("Success", "You have joined the community!");
      // Immediately refresh chats now that rules permit reads
      await fetchGroupChats();
    } catch (error: any) {
      console.error("Error joining community:", error);
      Alert.alert("Error", "Failed to join the community. Please try again.");
    }
  };

  const handleEditCommunity = () => {
    navigation.navigate("EditCommunityScreen", { community: communityData });
  };

  const handleDeleteCommunity = async () => {
    if (!uid || !isCreator) {
      Alert.alert(
        "Permission Denied",
        "You are not authorized to delete this community."
      );
      return;
    }

    Alert.alert(
      "Delete Community",
      `Are you sure you want to delete "${communityData.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (communityData.logo) {
                const imagePath = `community_logos/${communityData.id}.jpg`;
                const logoRef = ref(storage, imagePath);
                await deleteObject(logoRef);
              }
              const communityDocRef = doc(db, "communities", communityData.id);
              await deleteDoc(communityDocRef);

              Alert.alert(
                "Success",
                `Community "${communityData.name}" deleted successfully.`
              );
              navigation.goBack();
            } catch (error: any) {
              console.error("Error deleting community:", error);
              Alert.alert("Error", "Failed to delete community. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading community details...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      {isDeleting && (
        <View style={globalStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={globalStyles.loadingOverlayText}>Deleting community...</Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={globalStyles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={FONT_SIZES.xxlarge}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.header}>{communityData.name}</Text>
        {isCreator && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleEditCommunity}
          >
            <Ionicons name="settings-outline" size={24} style={styles.settingsIcon} />
          </TouchableOpacity>
        )}
      </View>

      <Image
        source={
          communityData.logo ? { uri: communityData.logo } : DEFAULT_COMMUNITY_LOGO
        }
        style={styles.communityLogo}
      />

      <Text style={styles.description}>
        {communityData.description || "No description available."}
      </Text>

      <View style={styles.infoSection}>
        {/* Display Location */}
        {communityData.location && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{communityData.location}</Text>
          </View>
        )}
        
        {/* Display Categories */}
        {communityData.categories && communityData.categories.length > 0 && (
          <View style={styles.categoryTagsContainer}>
            {communityData.categories.map(category => (
              <View key={category} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{category}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {!isMember && !isCreator && (
        <TouchableOpacity style={styles.joinButton} onPress={handleJoinCommunity}>
          <Text style={styles.joinButtonText}>Join Community</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.subHeader}>Group Chats</Text>
      {groupChats.length > 0 ? (
        <FlatList
          data={groupChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupChatItem}
              onPress={() =>
                navigation.navigate("GroupChatScreen", {
                  groupId: item.id,
                  groupName: item.name,
                  communityId: community.id,
                })
              }
            >
              <Text style={styles.groupChatText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.flatListContent}
        />
      ) : (
        <Text style={styles.noGroupsText}>No group chats available.</Text>
      )}

      {(isMember || isCreator) && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => {
            console.log(
              "NAVIGATING to CreateGroupChatScreen with communityId:",
              communityData.id
            );
            navigation.navigate("CreateGroupChatScreen", {
              communityId: communityData.id,
            });
          }}
        >
          <Text style={styles.saveButtonText}>+ Create Group Chat</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default CommunityDetailScreen;
