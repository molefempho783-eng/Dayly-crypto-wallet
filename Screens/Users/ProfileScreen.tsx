import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  // StyleProp, TextStyle // Removed if not directly needed for explicit casting
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, storage } from "../../firebaseConfig";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { useTheme } from '../context/ThemeContext';
import createStyles, { SPACING, FONT_SIZES } from '../context/appStyles'; 
import { useNavigation } from "@react-navigation/native"; 
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types"; 
import { Ionicons } from '@expo/vector-icons'; 

const DEFAULT_AVATAR = require("../../assets/avatar-placeholder.png");

// Define navigation prop type specifically for ProfileScreen
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, "ProfileScreen">;

const ProfileScreen = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const { colors, isThemeLoading } = useTheme();
  const navigation = useNavigation<ProfileScreenNavigationProp>();


  const styles = createStyles(colors).profileScreen;
  const globalStyles = createStyles(colors).global;

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [socialLink, setSocialLink] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [loading, setLoading] = useState(false); 
  const [username, setUsername] = useState<string>("");

  const [isProfileDataLoading, setIsProfileDataLoading] = useState(true); 

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setIsProfileDataLoading(false);
       navigation.navigate("AuthScreen");
    }
  }, [user, navigation]); 

  useEffect(() => {
  let mounted = true;
  (async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const fromDb = snap.exists() ? (snap.data() as any)?.username : undefined;
      const fallback = user.displayName || user.email?.split("@")[0] || "User";
      if (mounted) setUsername(fromDb || fallback);
    } catch {
      const fallback = user?.displayName || user?.email?.split("@")[0] || "User";
      if (mounted) setUsername(fallback);
    }
  })();
  return () => { mounted = false; };
}, [user]);

  const fetchUserProfile = async () => {
    if (!user) return; 
    setIsProfileDataLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSocialLink(data.socialLink || "");
        setAboutMe(data.aboutMe || "");
        setProfilePic(data.profilePic || null);
      }
    } catch (error: any) { // Type error
      console.error("Error fetching profile:", error);
      Alert.alert("Error", `Failed to load profile data: ${error.message || "Please try again."}`);
    } finally {
      setIsProfileDataLoading(false);
    }
  };

  const handleImagePick = async () => {
    // Check loading/isPickingImage to prevent multiple clicks
    if (loading) return; 
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library permissions to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to upload a profile picture.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      setProfilePic(downloadURL);

      await setDoc(
        doc(db, "users", user.uid),
        { profilePic: downloadURL },
        { merge: true }
      );
      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) { 
      console.error("Error uploading profile picture:", error);
      Alert.alert("Upload failed", `Could not upload profile picture: ${error.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to save your profile.");
      return;
    }
    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { socialLink: socialLink.trim(), aboutMe: aboutMe.trim() }, 
        { merge: true }
      );
      Alert.alert("Success", "Profile updated!");
    } catch (error: any) { 
      console.error("Error updating profile:", error);
      Alert.alert("Error", `Failed to update profile: ${error.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  // Conditional render for loading states (theme, profile data)
  if (isThemeLoading || isProfileDataLoading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingOverlayText}>
          {isThemeLoading ? "Loading theme..." : "Loading profile data..."}
        </Text>
      </View>
    );
  }
  // Conditional render if user is not logged in after initial loading
  if (!user) {
    return (
      <View style={globalStyles.centeredContainer}>
        <Text style={globalStyles.errorText}>You must be logged in to view your profile.</Text>
        {/* Added a button to navigate to AuthScreen for convenience */}
        <TouchableOpacity onPress={() => navigation.navigate("AuthScreen")} style={globalStyles.primaryButton}>
            <Text style={globalStyles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {loading && ( 
          <View style={globalStyles.loadingOverlay}> 
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={globalStyles.loadingOverlayText}>Saving...</Text> 
          </View>
        )}

        <View style={styles.headerContainer}>
           <TouchableOpacity
            onPress={() => navigation.goBack()} 
            style={globalStyles.backButton || globalStyles.primaryButton} 
          >
            <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <TouchableOpacity
          onPress={handleImagePick}
          style={styles.profilePicContainer}
          disabled={loading}
        >
          <Image
            source={profilePic ? { uri: profilePic } : DEFAULT_AVATAR}
            style={[styles.profilePic, { borderColor: colors.primary }]}
          />
          <Text style={styles.changePicText}>Change Profile Picture</Text>
        </TouchableOpacity>

<View style={styles.inputSection}>
  <Text style={styles.label}>Username</Text>
  <Text style={[styles.textInput, { paddingVertical: 12 }]}>
    {username || "User"}
  </Text>
</View>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Social Link (optional)</Text>
          <TextInput
            style={styles.textInput} // Removed StyleProp cast
            placeholder="https://your-social-profile"
            placeholderTextColor={colors.placeholderText as string}
            value={socialLink}
            onChangeText={setSocialLink}
            keyboardType="url"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={[styles.textInput, styles.aboutMeInput]} // Removed StyleProp cast
            placeholder="Write something about yourself..."
            placeholderTextColor={colors.placeholderText as string}
            value={aboutMe}
            onChangeText={setAboutMe}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.activeFilterText} /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;