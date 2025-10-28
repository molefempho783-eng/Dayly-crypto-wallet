import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from "react-native";
import {
  useNavigation,
  RouteProp,
  useRoute
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db, auth } from "../../../firebaseConfig";
import { RootStackParamList } from "../../../types";
import { useTheme } from "../../context/ThemeContext";
import createStyles from "../../context/appStyles";

type CreateGroupChatScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CreateGroupChatScreen"
>;
type CreateGroupChatScreenRouteProp = RouteProp<
  RootStackParamList,
  "CreateGroupChatScreen"
>;

const CreateGroupChatScreen = () => {
  const [groupName, setGroupName] = useState("");
  // ← add this:
  const [groupDescription, setGroupDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<CreateGroupChatScreenNavigationProp>();
  const route = useRoute<CreateGroupChatScreenRouteProp>();
  const { communityId } = route.params;
  const [user, setUser] = useState(auth.currentUser);

  const { colors } = useTheme();
  const styles = createStyles(colors).createGroupChatScreen;
  const globalStyles = createStyles(colors).global;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const handleCreateGroupChat = async () => {
    if (!groupName.trim()) {
      Alert.alert("Input Error", "Please enter a name for the group chat.");
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        "Authentication Error",
        "You must be logged in to create a group chat."
      );
      return;
    }

    setLoading(true);
    try {
      // Fetch community members
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("joinedCommunities", "array-contains", communityId)
      );
      const snapshot = await getDocs(q);

      const communityMembers: string[] = [];
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        if (data.uid) communityMembers.push(data.uid);
      });
      if (!communityMembers.includes(user.uid)) {
        communityMembers.push(user.uid);
      }

      // Create the group chat
      await addDoc(
        collection(db, "communities", communityId, "groupChats"),
        {
          name: groupName,
          description: groupDescription.trim(),    // ← now using state
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          members: communityMembers
        }
      );

      Alert.alert("Success", `Group chat "${groupName}" created!`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", `Failed to create group chat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user && !loading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <Text style={globalStyles.errorText}>
          You must be logged in to create a group chat.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("AuthScreen")}>
          <Text style={globalStyles.loginPromptText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Group Chat</Text>

      <TextInput
        style={styles.input}
        placeholder="Group Chat Name"
        placeholderTextColor={colors.placeholderText}
        value={groupName}
        onChangeText={setGroupName}
      />

      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        placeholder="Group Chat Description (Optional)"
        placeholderTextColor={colors.placeholderText}
        value={groupDescription}            // ← bind state here
        onChangeText={setGroupDescription}  // ← and update it here
        multiline
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateGroupChat}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.buttonText} />
        ) : (
          <Text style={styles.createButtonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default CreateGroupChatScreen;
