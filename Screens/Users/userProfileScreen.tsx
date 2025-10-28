import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { RootStackParamList } from "../../types";
import { StackNavigationProp } from "@react-navigation/stack";

import createStyles, { FONT_SIZES, SPACING } from '../context/appStyles';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons'; 

type UserProfileRouteProp = RouteProp<RootStackParamList, "UserProfileScreen">;
type NavigationProp = StackNavigationProp<RootStackParamList, "UserProfileScreen">;

interface UserData {
  username: string;
  profilePic?: string;
  aboutMe?: string;
  socialLink?: string;
}

const AVATAR_PLACEHOLDER = require("../../assets/avatar-placeholder.png");

const renderContentOrPlaceholder = (content?: string) => {
  return content?.trim() ? content : "Nothing to show here";
};

const UserProfileScreen = () => {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { userId } = route.params;

  const { colors } = useTheme();
  const styles = createStyles(colors).userprofileScreen;
  const globalStyles = createStyles(colors).global;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const fetchUserData = async () => {
    setRefreshing(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userDataFromFirestore = userDoc.data() as UserData;
        userDataFromFirestore.socialLink = typeof userDataFromFirestore.socialLink === 'string'
                                           ? userDataFromFirestore.socialLink
                                           : undefined;
        userDataFromFirestore.aboutMe = typeof userDataFromFirestore.aboutMe === 'string'
                                        ? userDataFromFirestore.aboutMe
                                        : undefined;
        setUser(userDataFromFirestore);
      } else {
        setUser(null);
        console.warn(`User with ID ${userId} not found.`);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert(`Failed to load profile: ${(error as Error).message || "Please try again."}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const handleChat = async () => {
    setChatLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You need to be logged in to chat.");
        console.error("DEBUG: Current user is null. Cannot start chat.");
        return;
      }

      // DEBUG LOGS START
      console.log("DEBUG: Current User UID:", currentUser.uid);
      console.log("DEBUG: Target User ID (from params):", userId);

      const chatId = [currentUser.uid, userId].sort().join("_");
      console.log("DEBUG: Constructed Chat ID:", chatId);

      const participantsObject = {
        [currentUser.uid]: true,
        [userId]: true
      };
      console.log("DEBUG: Participants object being sent:", participantsObject);

      // Verify if the `chatId` splits correctly into two parts
      const parts = chatId.split('_');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.error("DEBUG ERROR: Chat ID is not in expected 'UID1_UID2' format or parts are empty:", chatId);
        Alert.alert("Error", "Invalid chat ID format. Please contact support.");
        setChatLoading(false);
        return;
      }
      console.log("DEBUG: Chat ID parts (UID1, UID2):", parts[0], parts[1]);
      

      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        console.log("DEBUG: Chat document does not exist, attempting to create...");
        await setDoc(chatRef, {
          participants: participantsObject, // Use the explicitly logged object
          createdAt: serverTimestamp(),
        });
        console.log("DEBUG: Chat document creation initiated successfully.");
      } else {
        console.log("DEBUG: Chat document already exists. Proceeding to chat room.");
      }

      navigation.navigate("ChatRoomScreen", { chatId, recipientId: userId });

    } catch (error: any) {
      console.error("Error starting chat:", error);
      Alert.alert(`Failed to start chat: ${error.message || "Please try again."}`, "Check console for more details.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenLink = () => {
    const link = user?.socialLink;
    if (link) {
      if (typeof link === 'string' && (link.startsWith('http://') || link.startsWith('https://'))) {
          Linking.openURL(link).catch(err => {
              console.error('Failed to open social link:', err);
              Alert.alert('Could not open the link.', 'It might be invalid or not a supported format.');
          });
      } else {
          Alert.alert('Invalid Link', 'The social link format is not supported (must start with http:// or https://).');
          console.warn('Attempted to open invalid social link:', link);
      }
    } else {
        console.warn('No social link available to open.');
    }
  };

  if (loading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading user profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={globalStyles.centeredContainer}>
        <Text style={styles.errorText}>User profile not found.</Text>
        <TouchableOpacity onPress={fetchUserData} style={globalStyles.primaryButton}>
          <Text style={globalStyles.primaryButtonText}>Reload Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    
    <ScrollView
      contentContainerStyle={styles.scrollViewContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchUserData} colors={[colors.primary]} />
      }
    >
      <View style={globalStyles.headerContainer}>
           <TouchableOpacity
            onPress={() => navigation.goBack()} 
            style={globalStyles.backButton || globalStyles.primaryButton} 
          >
            <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} /> 
          </TouchableOpacity>
          <Text style={globalStyles.headerTitle}>Edit Profile</Text>
        </View>
      <View style={styles.profilePicContainer}>  
      <Image
        source={user.profilePic ? { uri: user.profilePic } : AVATAR_PLACEHOLDER}
        style={[styles.profilePic, { borderColor: colors.primary }]}
      />
    </View>
      <Text style={styles.username}>{user.username}</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>About Me</Text>
        <Text style={styles.bioText}>{renderContentOrPlaceholder(user.aboutMe)}</Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Social Link</Text>
        {user.socialLink ? (
          <TouchableOpacity onPress={handleOpenLink}>
            <Text style={styles.linkText}>{user.socialLink}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.bioText}>Nothing to show here</Text>
        )}
      </View>

      {auth.currentUser?.uid !== userId && (
        <TouchableOpacity
          style={[globalStyles.primaryButton, { marginTop: SPACING.xlarge }]}
          onPress={handleChat}
          disabled={chatLoading}
        >
          {chatLoading ? (
            <ActivityIndicator color={colors.activeFilterText} />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Chat</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default UserProfileScreen;
