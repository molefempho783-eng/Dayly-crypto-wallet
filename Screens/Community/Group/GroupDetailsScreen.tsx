import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet 
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native"; 
import { StackNavigationProp } from "@react-navigation/stack";
import { db, auth } from "../../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { RootStackParamList } from "../../../types"; 
import { useTheme } from '../../context/ThemeContext'; 
import createStyles from '../../context/appStyles'; 
import { SPACING, FONT_SIZES } from '../../context/appStyles'; 
import { Ionicons } from '@expo/vector-icons'; 

type GroupDetailsScreenRouteProp = RouteProp<RootStackParamList, "GroupDetailsScreen">;
type GroupDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, "GroupDetailsScreen">;

const GroupDetailsScreen = () => {
  const route = useRoute<GroupDetailsScreenRouteProp>();
  const navigation = useNavigation<GroupDetailsScreenNavigationProp>();
  const { groupId, communityId, groupName } = route.params;

  const [groupData, setGroupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(groupName);
  const [editedDescription, setEditedDescription] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [membersProfiles, setMembersProfiles] = useState<any[]>([]);

  const { colors } = useTheme(); 
  const styles = createStyles(colors).groupDetailsScreen;
  const globalStyles = createStyles(colors).global; 

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const groupDocRef = doc(db, "communities", communityId, "groupChats", groupId);
        const docSnap = await getDoc(groupDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupData(data);
          setEditedName(data.name || groupName);
          setEditedDescription(data.description || "");
          setIsCreator(data.createdBy === currentUserId);

          // Fetch member profiles
          const memberUids = data.members || [];
          let fetchedProfiles: any[] = []; // Changed from 'const' to 'let'
          if (memberUids.length > 0) {
            const profilePromises = memberUids.map(async (uid: string) => {
              const userDocRef = doc(db, "users", uid);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                return { uid, username: userData.username, profilePic: userData.profilePic };
              }
              return { uid, username: "Unknown User", profilePic: undefined };
            });
            fetchedProfiles = await Promise.all(profilePromises);
          }
          setMembersProfiles(fetchedProfiles);

        } else {
          Alert.alert("Error", "Group not found.");
          navigation.goBack();
        }
      } catch (error: any) {
        console.error("Error fetching group details:", error);
        Alert.alert("Error", "Failed to load group details.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupId, communityId, currentUserId, groupName, navigation]);

  const handleSave = async () => {
    if (!editedName.trim()) {
      Alert.alert("Input Error", "Group name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const groupDocRef = doc(db, "communities", communityId, "groupChats", groupId);
      await updateDoc(groupDocRef, {
        name: editedName.trim(),
        description: editedDescription.trim(),
      });
      setGroupData((prev: any) => ({ ...prev, name: editedName.trim(), description: editedDescription.trim() }));
      setIsEditing(false);
      Alert.alert("Success", "Group details updated!");
    } catch (error: any) {
      console.error("Error saving group details:", error);
      Alert.alert("Error", `Failed to save changes: ${error.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(groupData.name || groupName);
    setEditedDescription(groupData.description || "");
  };

  if (loading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary, marginTop: SPACING.medium }}>Loading group details...</Text>
      </View>
    );
  }

  if (!groupData) {
    return (
      <View style={globalStyles.centeredContainer}>
        <Text style={globalStyles.errorText}>Group details could not be loaded.</Text> 
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          {isCreator && !isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={FONT_SIZES.xlarge} color={colors.primary} />
            </TouchableOpacity>
          )}
          {isCreator && isEditing && (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { marginRight: SPACING.small }]}>
                <Ionicons name="checkmark" size={FONT_SIZES.xlarge} color={colors.buttonText} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Ionicons name="close" size={FONT_SIZES.xlarge} color={colors.buttonText} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Group Name */}
        <View style={styles.detailSection}>
          <Text style={styles.label}>Group Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter group name"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={styles.valueText}>{groupData.name}</Text>
          )}
        </View>

        {/* Group Description */}
        <View style={styles.detailSection}>
          <Text style={styles.label}>Description</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Enter group description (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          ) : (
            <Text style={styles.valueText}>{groupData.description || "No description"}</Text>
          )}
        </View>

        {/* Group Members */}
        <View style={styles.detailSection}>
          <Text style={styles.label}>Members ({membersProfiles.length})</Text>
          <View style={styles.membersList}>
             {membersProfiles.map((member) => (
                <TouchableOpacity 
                    key={member.uid}
                    onPress={() => navigation.navigate("UserProfileScreen", { userId: member.uid })} // Navigate to UserProfileScreen
                    style={styles.memberItem}
                >
                    {member.profilePic ? (
                    <Image source={{ uri: member.profilePic }} style={styles.memberAvatar} />
                    ) : (
                    <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
                        <Text style={styles.memberAvatarFallbackText}>{member.username?.charAt(0).toUpperCase() || '?'}</Text>
                    </View>
        )}
        <Text style={styles.memberName}>{member.username}</Text>
      </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.detailSection}>
            <Text style={styles.label}>Created By</Text>
            <Text style={styles.valueText}>{isCreator ? 'You' : groupData.createdBy}</Text>
        </View>

        <View style={styles.detailSection}>
            <Text style={styles.label}>Created At</Text>
            <Text style={styles.valueText}>{groupData.createdAt?.toDate().toLocaleString() || 'N/A'}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default GroupDetailsScreen;