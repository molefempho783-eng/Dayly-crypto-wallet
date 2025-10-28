import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Message } from "../../../types"; // Import Message from types.ts
import { db, auth } from "../../../firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp, // Import Timestamp for message type
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { useTheme } from '../../context/ThemeContext';
import createStyles, { SPACING, FONT_SIZES } from '../../context/appStyles';
import { Ionicons } from '@expo/vector-icons';

const AVATAR_PLACEHOLDER = require("../../../assets/avatar-placeholder.png");

const EMOJI_API_URL = 'https://emoji-api.com/emojis?access_key=f4afea21bfcc54275a9e03d3daf1bb0bb82c19f3';
const FALLBACK_EMOJIS = [
  '😀', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😙',
  '😚', '😋', '😛', '😜', '🤪', '😝', '🤤', '😴', '😷', '🤒',
  '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳',
  '😎', '🤓', '🤔', '🫣', '🤫', '🫢', '🫡', '🤥', '🫠', '😮‍💨',
  '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '👻', '👽', '👾',
  '🤖', '💩', '🤡', '👹', '👺', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌',
  '🤏', '🤞', '✌️', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
  '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶',
  '🤲', '🤝', '🫱‍🫲', '🫲‍🫱', '🫳', '🫴', '🫷', '🫸', '💅', '🤳',
  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀',
  '🫁', '🦷', '🦴', '👁️', '👀', '👅', '👄', '👶', '👦', '👧',
];


type GroupChatScreenRouteProp = RouteProp<RootStackParamList, "GroupChatScreen">;
type GroupChatScreenNavigationProp = StackNavigationProp<RootStackParamList, "GroupChatScreen">;

const GroupChatScreen = () => {
  const route = useRoute<GroupChatScreenRouteProp>();
  const navigation = useNavigation<GroupChatScreenNavigationProp>();
  const { groupId, groupName, communityId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [isGroupMember, setIsGroupMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [communityLogo, setCommunityLogo] = useState<string | null>(null);
  const [senderProfileCache, setSenderProfileCache] = useState<Map<string, { username: string, profilePic?: string }>>(new Map());

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors).groupChatScreen;
  const globalStyles = createStyles(colors).global;
  const storage = getStorage();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchCommunityLogo = async () => {
      try {
        const communityDocRef = doc(db, "communities", communityId);
        const communitySnap = await getDoc(communityDocRef);
        if (communitySnap.exists()) {
          const data = communitySnap.data();
          if (data.logo) {
            setCommunityLogo(data.logo);
          }
        }
      } catch (error: any) {
        console.error("Error fetching community logo:", error);
      }
    };
    fetchCommunityLogo();
  }, [communityId]);


  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    const groupDocRef = doc(db, "communities", communityId, "groupChats", groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = docSnap.data();
        const members = groupData.members || [];
        setIsGroupMember(members.includes(currentUserId));
      } else {
        Alert.alert("Error", "Group chat not found.");
      }
      setIsLoading(false);
    }, (error: any) => {
      console.error("Error fetching group details:", error);
      Alert.alert("Error", "Failed to load group details.");
      setIsLoading(false);
    });

    return () => unsubscribeGroup();
  }, [communityId, groupId, currentUserId]);


  useEffect(() => {
    const messagesRef = collection(db, "communities", communityId, "groupChats", groupId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const uniqueSenderIds = new Set<string>();
      snapshot.docs.forEach(doc => uniqueSenderIds.add(doc.data().senderId));

      const newSenderProfiles = new Map(senderProfileCache);
      const fetchPromises: Promise<void>[] = [];

      uniqueSenderIds.forEach(senderId => {
        if (senderId && !newSenderProfiles.has(senderId)) {
          const userDocRef = doc(db, "users", senderId);
          fetchPromises.push(
            getDoc(userDocRef).then(userSnap => {
              if (userSnap.exists()) {
                const userData = userSnap.data();
                newSenderProfiles.set(senderId, {
                  username: userData.username || "Unknown User",
                  profilePic: userData.profilePic || undefined,
                });
              } else {
                newSenderProfiles.set(senderId, { username: "Unknown User", profilePic: undefined });
              }
            }).catch((error: any) => {
              console.error("Error fetching sender profile:", senderId, error);
              newSenderProfiles.set(senderId, { username: "Unknown User", profilePic: undefined });
            })
          );
        }
      });

      await Promise.all(fetchPromises);
      setSenderProfileCache(newSenderProfiles);

      const loadedMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        const senderProfile = newSenderProfiles.get(data.senderId);
        return {
          id: doc.id,
          text: data.text,
          sender: data.sender || (senderProfile ? senderProfile.username : "Unknown User"),
          senderId: data.senderId,
          timestamp: data.timestamp as Timestamp, // Ensure it's treated as Timestamp
          senderProfilePic: senderProfile ? senderProfile.profilePic : undefined,
          mediaUrl: data.mediaUrl || undefined,
          mediaType: data.mediaType || undefined,
          fileName: data.fileName || undefined,
          fileSize: data.fileSize || undefined,
        } as Message;
      });

      setMessages(prevMessages => {
        const optimisticPending = prevMessages.filter(msg => msg.uploading || msg.uploadError);
        const finalMessages = [
          ...optimisticPending.filter(optMsg => !loadedMessages.some(serverMsg => serverMsg.id === optMsg.id)),
          ...loadedMessages
        ];
        return finalMessages.sort((a, b) => {
          // Fix: Safely convert Timestamp or Date to a number for comparison
          const timeA = (a.timestamp instanceof Timestamp ? a.timestamp.toDate() : a.timestamp)?.getTime() || 0;
          const timeB = (b.timestamp instanceof Timestamp ? b.timestamp.toDate() : b.timestamp)?.getTime() || 0;
          return timeA - timeB;
        });
      });

    }, (error: any) => {
      console.error("Error fetching messages:", error);
      Alert.alert("Error", "Failed to load messages.");
    });

    return () => unsubscribe();
  }, [communityId, groupId, senderProfileCache, currentUserId]);


  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);


  const sendMessage = async (messageContent: { text?: string; mediaUrl?: string; mediaType?: 'image' | 'video' | 'file'; fileName?: string; fileSize?: number; tempId?: string }) => {
    if (!currentUserId) {
      Alert.alert("Error", "You need to be logged in to send messages.");
      return;
    }
    if (!messageContent.text && !messageContent.mediaUrl) return;

    const groupDocRef = doc(db, "communities", communityId, "groupChats", groupId);
    
    let username = "Unknown User";
    let profilePic: string | undefined = undefined;
    try {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            username = userData.username || "Unknown User";
            profilePic = userData.profilePic || undefined;
        }
    } catch (error: any) {
        console.warn("Could not fetch sender profile for message:", error);
    }

    const messageData: { [key: string]: any } = {
      senderId: currentUserId,
      sender: username,
      timestamp: serverTimestamp(),
      senderProfilePic: profilePic,
    };

    if (messageContent.text !== undefined) messageData.text = messageContent.text;
    if (messageContent.mediaUrl !== undefined) messageData.mediaUrl = messageContent.mediaUrl;
    if (messageContent.mediaType !== undefined) messageData.mediaType = messageContent.mediaType;
    if (messageContent.fileName !== undefined) messageData.fileName = messageContent.fileName;
    if (messageContent.fileSize !== undefined) messageData.fileSize = messageContent.fileSize;

    try {
      const messagesCollectionRef = collection(groupDocRef, 'messages');
      const newMessageRef = await addDoc(messagesCollectionRef, messageData);
      
      if (messageContent.tempId) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
              msg.tempId === messageContent.tempId ? { ...msg, id: newMessageRef.id, tempId: undefined, uploading: false, uploadProgress: 100 } : msg
          )
        );
      }

      // CRUCIAL: Update parent group chat document
      let lastMessagePreviewText = messageContent.text || '';
      if (messageContent.mediaType === 'image') lastMessagePreviewText = 'Image 📸';
      else if (messageContent.mediaType === 'video') lastMessagePreviewText = 'Video 🎥';
      else if (messageContent.mediaType === 'file') lastMessagePreviewText = `File 📄: ${messageContent.fileName}`;

      await updateDoc(groupDocRef, {
        lastMessageText: lastMessagePreviewText,
        lastMessageSenderId: currentUserId,
        lastMessageTimestamp: serverTimestamp(),
      });

      setNewMessage('');
      setShowAttachmentOptions(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      Alert.alert("Error", `Could not send message: ${(error as Error).message}`);
      if (messageContent.tempId) {
          setMessages(prevMessages =>
              prevMessages.map(msg =>
                  msg.tempId === messageContent.tempId ? { ...msg, uploading: false, uploadError: (error as Error).message } : msg
              )
          );
      }
    }
  };

 const uploadMediaToFirebase = async (
  uri: string,
  fileType: 'image' | 'video' | 'file',
  fileNameWithExtension: string = 'file',
  tempMessageId: string
) => {
  setIsUploadingMedia(true);

  const response = await fetch(uri);
  const blob = await response.blob();

  // ✅ FIXED: correct path matching your Firebase Storage rules
  const path = `group_chat_media/${communityId}/${groupId}/${currentUserId}/${fileNameWithExtension}`;

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob);

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes);
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.tempId === tempMessageId
              ? { ...msg, uploadProgress: progress * 100 }
              : msg
          )
        );
      },
      (error: any) => {
        console.error(`Media/File upload failed (${fileType}):`, error);
        setIsUploadingMedia(false);
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.tempId === tempMessageId
              ? { ...msg, uploading: false, uploadError: error.message }
              : msg
          )
        );
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setIsUploadingMedia(false);
        sendMessage({
          mediaUrl: downloadURL,
          mediaType: fileType,
          fileName: fileType === 'file' ? fileNameWithExtension : undefined,
          fileSize: blob.size,
          tempId: tempMessageId,
        });
        resolve(downloadURL);
      }
    );
  });
};


  const handlePickMedia = async (mediaType: 'image' | 'video') => {
    setShowAttachmentOptions(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", `Permission to access ${mediaType} library is required!`);
      return;
    }

    let result;
    if (mediaType === 'image') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const fileNameWithExtension = uri.split('/').pop() || (mediaType === 'image' ? 'image.jpg' : 'video.mp4');
      const tempId = `temp_${Date.now()}`;

      setMessages(prevMessages => [...prevMessages, {
        id: tempId, tempId, senderId: currentUserId!, createdAt: new Date(), sender: 'You',
        mediaUrl: uri, mediaType, uploading: true, uploadProgress: 0,
        timestamp: Timestamp.fromDate(new Date()),
      }]);
      scrollViewRef.current?.scrollToEnd({ animated: true });

      try {
        await uploadMediaToFirebase(uri, mediaType, fileNameWithExtension, tempId);
      } catch (error: any) {
        // Error handled in uploadMediaToFirebase
      }
    }
  };

  const handlePickFile = async () => {
    setShowAttachmentOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const uri = file.uri;
        const fileName = file.name;
        const fileSize = file.size;

        if (!fileName || !fileSize) {
          Alert.alert("File Error", "Could not get file name or size.");
          return;
        }

        const fileExtension = fileName.split('.').pop() || 'bin';
        const fileNameWithExtension = `${fileName.split('.')[0] || 'file'}.${fileExtension}`;
        const tempId = `temp_${Date.now()}`;

        setMessages(prevMessages => [...prevMessages, {
          id: tempId, tempId, senderId: currentUserId!, createdAt: new Date(), sender: 'You',
          mediaUrl: uri, mediaType: 'file', fileName, fileSize, uploading: true, uploadProgress: 0,
          timestamp: Timestamp.fromDate(new Date()),
        }]);
        scrollViewRef.current?.scrollToEnd({ animated: true });

        try {
          await uploadMediaToFirebase(uri, 'file', fileNameWithExtension, tempId);
        } catch (error: any) {
          // Error handled in uploadMediaToFirebase
        }
      }
    } catch (error: any) {
      console.error("Error picking file:", error);
      Alert.alert("File Picker Error", `Failed to pick file: ${(error as Error).message}`);
    }
  };

  const handleSendText = () => {
    if (newMessage.trim() === '') return;
    sendMessage({ text: newMessage.trim() });

  };

const handleAddEmoji = (emoji: string) => {
  setNewMessage((prev) => prev + emoji);
  setShowEmojiPicker(false);
};  

  const handleJoinGroup = async () => { // Correctly defined function
    if (!currentUserId) return;
    try {
      const groupDocRef = doc(db, "communities", communityId, "groupChats", groupId);
      await updateDoc(groupDocRef, {
        members: arrayUnion(currentUserId)
      });
      setIsGroupMember(true);
      Alert.alert("Joined!", `You have joined "${groupName}".`);
    } catch (error: any) {
      console.error("Error joining group:", error);
      Alert.alert("Error", "Failed to join group.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === currentUserId; // Correct variable name
    const displayProfilePic = item.senderProfilePic || AVATAR_PLACEHOLDER;
    const isUploading = item.uploading && item.uploadProgress !== undefined && item.uploadProgress < 100;

    return (
      <View
        key={item.id}
        style={[
          styles.messageBubbleWrapper,
          isMyMessage ? styles.myMessageBubbleWrapper : styles.otherMessageBubbleWrapper,
        ]}
      >
        {!isMyMessage && (
          <Image source={typeof displayProfilePic === 'string' ? { uri: displayProfilePic } : displayProfilePic} style={styles.messageAvatar} />
        )}

        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
            item.uploadError && styles.messageErrorBubble,
          ]}
        >
          {!isMyMessage && <Text style={styles.sender}>{item.sender}</Text>}

          {item.mediaType === 'image' && item.mediaUrl ? (
            <Image source={{ uri: item.mediaUrl }} style={styles.mediaMessageImage} />
          ) : item.mediaType === 'video' && item.mediaUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.mediaUrl!)} style={styles.videoMessageContainer}>
              <Image
                source={{ uri: `https://placehold.co/200x150/000000/FFFFFF?text=VIDEO%0APreview` }}
                style={styles.mediaMessageImage}
              />
              <Text style={styles.videoPlayText}>Tap to Play Video</Text>
            </TouchableOpacity>
          ) : item.mediaType === 'file' && item.mediaUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.mediaUrl!)} style={styles.fileMessageContainer}>
              <Ionicons name="document-text-outline" size={FONT_SIZES.xxlarge} color={colors.textPrimary} style={styles.fileIcon} />
              <View style={styles.fileDetails}>
                <Text style={styles.fileNameText} numberOfLines={1}>{item.fileName || 'Unknown File'}</Text>
                <Text style={styles.fileSizeText}>{item.fileSize ? formatFileSize(item.fileSize) : 'N/A'}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {item.text && <Text style={isMyMessage ? styles.myMessageText : styles.message}>{item.text}</Text>}

          {item.uploadError ? (
            <Text style={styles.uploadErrorText}>Upload Failed: {item.uploadError.substring(0, Math.min(item.uploadError.length, 30))}...</Text>
          ) : isUploading ? (
            <View style={styles.uploadProgressBarContainer}>
              <View style={[styles.uploadProgressBar, { width: `${item.uploadProgress || 0}%` }]} />
              <Text style={styles.uploadProgressText}>Uploading {Math.round(item.uploadProgress || 0)}%</Text>
            </View>
          ) : null}

          <Text style={styles.timestamp}>
            {/* Fix: Safely convert Timestamp or Date to a human-readable string */}
            {item.timestamp ? (item.timestamp instanceof Timestamp ? item.timestamp.toDate() : item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
          </Text>
        </View>

        {isMyMessage && (
          <Image source={typeof displayProfilePic === 'string' ? { uri: displayProfilePic } : displayProfilePic} style={styles.messageAvatar} />
        )}
      </View>
    );
  }, [currentUserId, styles, colors]);


  if (isLoading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary, marginTop: SPACING.medium }}>Loading group...</Text>
      </View>
    );
  }

  if (!currentUserId) {
    return (
      <View style={globalStyles.centeredContainer}>
        <Text style={globalStyles.errorText}>You must be logged in to view this group chat.</Text>
        <TouchableOpacity onPress={() => navigation.navigate("AuthScreen")}>
          <Text style={globalStyles.loginPromptText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* Header with Back Button, Group Name/Pic, and Details Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
          </TouchableOpacity>

          {communityLogo ? (
            <Image source={{ uri: communityLogo }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarFallbackText}>{groupName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.headerTitle}>{groupName}</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("GroupDetailsScreen", { groupId, groupName, communityId })}
            style={styles.groupDetailsButton}
          >
            <Ionicons name="information-circle-outline" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {!isGroupMember ? (
          <View style={globalStyles.centeredContainer}>
            <Text style={styles.joinPromptText}>You are not a member of this group chat.</Text>
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup}>
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.messageScrollView}
              contentContainerStyle={styles.messageList}
              ref={scrollViewRef}
            >
              {messages.map((item) => renderMessage({ item }))}
            </ScrollView>

            <View style={styles.inputContainer}>
              {/* Attachment Options View - toggled by showAttachmentOptions */}
              {showAttachmentOptions && (
                <View style={styles.attachmentOptionsContainer}>
                  <TouchableOpacity onPress={() => handlePickMedia('image')} style={styles.attachmentOptionButton}>
                    <Text style={styles.attachmentOptionButtonText}>📸 Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePickMedia('video')} style={styles.attachmentOptionButton}>
                    <Text style={styles.attachmentOptionButtonText}>🎥 Video</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickFile} style={styles.attachmentOptionButton}>
                    <Text style={styles.attachmentOptionButtonText}>📁 File</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showEmojiPicker && (
                <View style={styles.emojiPickerContainer}>
                  <ScrollView contentContainerStyle={styles.emojiPickerScroll}>
                    {FALLBACK_EMOJIS.map((emoji, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleAddEmoji(emoji)}
                        style={styles.emojiItem}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {isUploadingMedia ? (
                <View style={styles.mediaUploadIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.mediaUploadText}>Preparing upload...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowAttachmentOptions(!showAttachmentOptions)} style={styles.attachmentButton}>
                    <Ionicons name="add-circle-outline" size={FONT_SIZES.xxlarge} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={styles.emojiButton}
                  >
                    <Ionicons name="happy-outline" size={FONT_SIZES.xxlarge} color={colors.primary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendText}
                    disabled={newMessage.trim() === '' && !isUploadingMedia}
                  >
                    <Ionicons name="send" size={FONT_SIZES.xlarge} color={colors.buttonText} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GroupChatScreen;