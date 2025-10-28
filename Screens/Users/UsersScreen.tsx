// Screens/Users/UsersScreen.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  where,
  query,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import createStyles, { FONT_SIZES } from "../context/appStyles";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

const DEFAULT_AVATAR = require("../../assets/avatar-placeholder.png");

type NavigationProp = StackNavigationProp<RootStackParamList, "ChatRoomScreen">;

type UserRow = {
  id: string;
  username: string;
  profilePic?: string;
  aboutMe?: string;
};

type ChatDoc = {
  participants: string[];
  unreadFor?: Record<string, boolean>;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageTimestamp?: any;
};

const UsersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const styles = createStyles(colors).usersScreen;
  const globalStyles = createStyles(colors).global;

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "frequent", title: "Frequently Contacted" },
    { key: "explore", title: "Explore" },
  ]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [frequentContacts, setFrequentContacts] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadByUser, setUnreadByUser] = useState<Record<string, boolean>>({});
  const [previewByUser, setPreviewByUser] = useState<
    Record<string, { text?: string; senderId?: string; ts?: any }>
  >({});
  const [currentUserData, setCurrentUserData] = useState<UserRow | null>(null);

  const currentUser = auth.currentUser;

  /** 🟢 Real-time all users listener */
  useFocusEffect(
    useCallback(() => {
      if (!currentUser) return;

      const unsub = onSnapshot(
        collection(db, "users"),
        (snap) => {
          const list: UserRow[] = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((u) => u.id !== currentUser.uid);
          list.sort((a, b) =>
            String(a.username || "").localeCompare(String(b.username || ""))
          );
          setUsers(list);
          setLoading(false);
        },
        (err) => {
          console.error("Users load error", err);
          setLoading(false);
        }
      );

      return unsub;
    }, [currentUser])
  );

  /** 👤 Fetch current user's data */
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
setCurrentUserData({ ...(snap.data() as UserRow), id: currentUser.uid });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };
    fetchProfile();
  }, [currentUser]);

  /** 🔄 Real-time chats listener — updates frequent contacts instantly */
  useEffect(() => {
    if (!currentUser) return;

    const qChats = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsub = onSnapshot(qChats, (snap) => {
      const unreadMap: Record<string, boolean> = {};
      const previews: Record<string, { text?: string; senderId?: string; ts?: any }> = {};
      const contactIds = new Set<string>();

      snap.docs.forEach((d) => {
        const data = d.data() as ChatDoc;
        const otherId = data.participants.find((p) => p !== currentUser.uid);
        if (!otherId) return;

        contactIds.add(otherId);
        unreadMap[otherId] = !!data.unreadFor?.[currentUser.uid];
        previews[otherId] = {
          text: data.lastMessageText,
          senderId: data.lastMessageSenderId,
          ts: data.lastMessageTimestamp,
        };
      });

      const recent = users.filter((u) => contactIds.has(u.id));
      setFrequentContacts(recent);
      setUnreadByUser(unreadMap);
      setPreviewByUser(previews);
    });

    return unsub;
  }, [currentUser, users]);

  /** 🔍 Search filter logic */
  const filteredList = (base: UserRow[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (u) =>
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.aboutMe || "").toLowerCase().includes(q)
    );
  };

  /** 💬 Start chat */
  const handleStartChat = async (user: UserRow) => {
    if (!currentUser) return;
    try {
      const chatId = [currentUser.uid, user.id].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      await setDoc(
        chatRef,
        {
          participants: [currentUser.uid, user.id],
          createdAt: serverTimestamp(),
          unreadFor: { [currentUser.uid]: false, [user.id]: false },
        },
        { merge: true }
      );
      navigation.navigate("ChatRoomScreen", { chatId, recipientId: user.id });
    } catch (e) {
      console.error("Error starting chat:", e);
      Alert.alert("Error", "Could not start chat. Please try again.");
    }
  };

  /** 🧩 Render each user row */
  const renderRow = ({ item }: { item: UserRow }) => {
    const unread = !!unreadByUser[item.id];
    const preview = previewByUser[item.id];

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleStartChat(item)}
      >
        {item.profilePic ? (
          <Image source={{ uri: item.profilePic }} style={styles.memberAvatar} />
        ) : (
          <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
            <Text style={styles.memberAvatarFallbackText}>
              {item.username?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
        )}

        <View style={styles.userCardContent}>
          <Text style={styles.userCardUsername}>{item.username}</Text>
          <Text style={styles.lastMessagePreview} numberOfLines={1}>
            {preview?.text
              ? preview.text
              : item.aboutMe || "Tap to start chat"}
          </Text>
        </View>

        {unread && (
          <View
            style={{
              width: 15,
              height: 15,
              borderRadius: 8,
              backgroundColor: "#1DB954",
              marginLeft: 8,
            }}
          />
        )}
      </TouchableOpacity>
    );
  };

  /** 🧭 Tab scenes */
  const FrequentRoute = () => (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search frequent contacts..."
        placeholderTextColor={colors.placeholderText as string}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <View style={globalStyles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredList(frequentContacts)}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>
              No frequent contacts yet.
            </Text>
          }
        />
      )}
    </View>
  );

  const ExploreRoute = () => (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search all users..."
        placeholderTextColor={colors.placeholderText as string}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <View style={globalStyles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredList(users)}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>No users found.</Text>
          }
        />
      )}
    </View>
  );

  const renderScene = SceneMap({
    frequent: FrequentRoute,
    explore: ExploreRoute,
  });

  /** 🖥 UI */
  return (
    <SafeAreaView style={globalStyles.safeArea}>
      {/* Header with Profile Pic */}
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Users</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("ProfileScreen")}
          style={{ marginLeft: "auto" }}
        >
          {currentUserData?.profilePic ? (
            <Image
              source={{ uri: currentUserData.profilePic }}
              style={styles.memberAvatar}
            />
          ) : (
            <View
              style={[styles.memberAvatar, styles.memberAvatarFallback]}
            >
              <Text style={styles.memberAvatarFallbackText}>
                {currentUserData?.username?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        swipeEnabled
        initialLayout={{ width: 360 }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            style={{
              backgroundColor: colors.background,
              elevation: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderColor,
            }}
            indicatorStyle={{ height: 3, backgroundColor: colors.primary }}
            activeColor={colors.primary}
            inactiveColor={colors.secondaryText}
          />
        )}
      />
    </SafeAreaView>
  );
};

export default UsersScreen;
