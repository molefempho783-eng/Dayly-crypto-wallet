// Screens/ChatRoomScreen.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { RootStackParamList } from '../../types';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import createStyles, { SPACING, FONT_SIZES } from '../context/appStyles';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

type ChatRoomScreenRouteProp = RouteProp<RootStackParamList, 'ChatRoomScreen'>;
type ChatRoomScreenNavigationProp = any;

interface Message {
  id: string;
  text?: string;
  senderId: string;
  createdAt: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  fileSize?: number;
}

const AVATAR_PLACEHOLDER = require('../../assets/avatar-placeholder.png');

const EMOJI_API_URL =
  'https://emoji-api.com/emojis?access_key=f4afea21bfcc54275a9e03d3daf1bb0bb82c19f3';

const FALLBACK_EMOJIS = [
  '😀','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🤔','🫣','🤫','🫢','🫡','🤥','🫠','😮‍💨','😤','😠','😡','🤬','😈','👿','💀','👻','👽','👾','🤖','💩','🤡','👹','👺','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐️','✋','🖖','👌','🤏','🤞','✌️','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','🤲','🤝',
];

const ChatRoomScreen = () => {
  const route = useRoute<ChatRoomScreenRouteProp>();
  const navigation = useNavigation<ChatRoomScreenNavigationProp>();
  const { chatId, recipientId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipientUsername, setRecipientUsername] = useState('Loading...');
  const [recipientProfilePic, setRecipientProfilePic] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [fetchingEmojis, setFetchingEmojis] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

  const currentUser = auth.currentUser;
  const { colors } = useTheme();
  const styles = createStyles(colors).chatRoomScreen;
  const globalStyles = createStyles(colors).global;
  const storage = getStorage();

  // ---- keep input visible above keyboard
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const KAV_OFFSET =
    (Platform.OS === 'ios' ? headerHeight : 0) + Math.max(insets.top, 0);
  const [inputBarHeight, setInputBarHeight] = useState(56);
  const extraPanelHeight =
    (showEmojiPicker ? 240 : 0) + (showAttachmentOptions ? 160 : 0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!loading) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, loading]);

  // Load recipient info & messages; clear unread flag on open
  useEffect(() => {
    if (!currentUser) {
      console.warn('User not logged in for chat.');
      navigation.goBack();
      return;
    }

    const ensureChatExistsAndClearUnread = async () => {
      try {
        const chatDocRef = doc(db, 'chats', chatId);
        const snap = await getDoc(chatDocRef);
        if (!snap.exists()) {
          await setDoc(
            chatDocRef,
            {
              // use LIST to match rules
              participants: [currentUser.uid, recipientId],
              createdAt: serverTimestamp(),
              unreadFor: { [currentUser.uid]: false, [recipientId]: false },
            },
            { merge: true }
          );
        }
        // mark my side as read
        await updateDoc(chatDocRef, { [`unreadFor.${currentUser.uid}`]: false });
      } catch {
        // ignore
      }
    };

    const fetchRecipientData = async () => {
      if (!recipientId) return;
      try {
        const userDocRef = doc(db, 'users', recipientId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRecipientUsername(userData.username || 'Unknown User');
          setRecipientProfilePic(
            typeof userData.profilePic === 'string' ? userData.profilePic : null
          );
        } else {
          setRecipientUsername('User Not Found');
          setRecipientProfilePic(null);
        }
      } catch (error: any) {
        console.error('Error fetching recipient data:', error);
        setRecipientUsername('Error');
        setRecipientProfilePic(null);
      }
    };

    ensureChatExistsAndClearUnread();
    fetchRecipientData();

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const serverMessages = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Message[];
        setMessages(serverMessages);
        setLoading(false);
      },
      (error: any) => {
        console.error('Error fetching messages:', error);
        Alert.alert('Error', `Failed to load messages: ${error?.message || 'unknown'}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser, recipientId, navigation]);

  const fetchEmojis = useCallback(async () => {
    if (emojis.length > 0 || fetchingEmojis) return;
    setFetchingEmojis(true);
    try {
      const response = await fetch(EMOJI_API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const fetched = data
        .filter((e: { unicodeName: string }) => !e.unicodeName.includes('skin tone'))
        .map((e: { character: string }) => e.character);
      setEmojis(fetched.slice(0, 200));
    } catch {
      setEmojis(FALLBACK_EMOJIS);
    } finally {
      setFetchingEmojis(false);
    }
  }, [emojis.length, fetchingEmojis]);

  useEffect(() => {
    if (showEmojiPicker && emojis.length === 0 && !fetchingEmojis) {
      fetchEmojis();
    }
  }, [showEmojiPicker, emojis.length, fetchingEmojis, fetchEmojis]);

  // Upload file/image/video to storage, then send the message (no optimistic bubble)
  const uploadMediaToFirebase = async (
    uri: string,
    fileType: 'image' | 'video' | 'file',
    fileNameWithExtension: string = 'file'
  ) => {
    if (!currentUser) return;
    setIsUploadingMedia(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `chat_media/${chatId}/${currentUser.uid}_${Date.now()}_${fileNameWithExtension}`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      const downloadURL: string = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          () => {},
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      await sendMessage({
        mediaUrl: downloadURL,
        mediaType: fileType,
        fileName: fileType === 'file' ? fileNameWithExtension : undefined,
        fileSize: blob.size,
      });
    } catch (error: any) {
      console.error(`Media upload failed (${fileType}):`, error);
      Alert.alert('Upload Error', error?.message || 'Failed to upload file.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Create Firestore message; update lastMessage + unread flags
  const sendMessage = async (content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'file';
    fileName?: string;
    fileSize?: number;
  }) => {
    if (!currentUser) {
      Alert.alert('Error', 'You need to be logged in to send messages.');
      return;
    }
    if (!content.text && !content.mediaUrl) return;

    try {
      const chatDocRef = doc(db, 'chats', chatId);

      const messageData: Record<string, any> = {
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };
      if (content.text !== undefined) messageData.text = content.text;
      if (content.mediaUrl !== undefined) messageData.mediaUrl = content.mediaUrl;
      if (content.mediaType !== undefined) messageData.mediaType = content.mediaType;
      if (content.fileName !== undefined) messageData.fileName = content.fileName;
      if (content.fileSize !== undefined) messageData.fileSize = content.fileSize;

      await addDoc(collection(chatDocRef, 'messages'), messageData);

      let lastMessagePreviewText = content.text || '';
      if (content.mediaType === 'image') lastMessagePreviewText = 'Image 📸';
      else if (content.mediaType === 'video') lastMessagePreviewText = 'Video 🎥';
      else if (content.mediaType === 'file') lastMessagePreviewText = `File 📄: ${content.fileName}`;

      await updateDoc(chatDocRef, {
        lastMessageText: lastMessagePreviewText,
        lastMessageSenderId: currentUser.uid,
        lastMessageTimestamp: serverTimestamp(),
        [`unreadFor.${recipientId}`]: true, // recipient sees unread
        [`unreadFor.${currentUser.uid}`]: false,
      });

      setNewMessage('');
      setShowEmojiPicker(false);
      setShowAttachmentOptions(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', `Could not send message: ${error?.message || 'unknown error'}`);
    }
  };

  const handlePickMedia = async (mediaType: 'image' | 'video') => {
    setShowAttachmentOptions(false);
    setShowEmojiPicker(false);

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', `Permission to access ${mediaType} library is required!`);
      return;
    }

    let result: ImagePicker.ImagePickerResult;
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
      const fileNameWithExtension =
        uri.split('/').pop() || (mediaType === 'image' ? 'image.jpg' : 'video.mp4');
      await uploadMediaToFirebase(uri, mediaType, fileNameWithExtension);
    }
  };

  const handlePickFile = async () => {
    setShowAttachmentOptions(false);
    setShowEmojiPicker(false);
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
          Alert.alert('File Error', 'Could not get file name or size.');
          return;
        }

        const fileExtension = fileName.split('.').pop() || 'bin';
        const fileNameWithExtension = `${fileName.split('.')[0] || 'file'}.${fileExtension}`;
        await uploadMediaToFirebase(uri, 'file', fileNameWithExtension);
      }
    } catch (error: any) {
      console.error('Error picking file:', error);
      Alert.alert('File Picker Error', `Failed to pick file: ${error?.message || 'unknown error'}`);
    }
  };

  const handleSendEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleSendText = () => {
    if (newMessage.trim() === '') return;
    sendMessage({ text: newMessage.trim() });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === currentUser?.uid;

    return (
      <View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.myMessageBubble : styles.otherMessageBubble,
        ]}
      >
        {item.mediaType === 'image' && item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.mediaMessageImage} />
        ) : item.mediaType === 'video' && item.mediaUrl ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.mediaUrl!)}
            style={styles.videoMessageContainer}
          >
            <Image
              source={{
                uri: `https://placehold.co/200x150/000000/FFFFFF?text=VIDEO%0APreview`,
              }}
              style={styles.mediaMessageImage}
            />
            <Text style={styles.videoPlayText}>Tap to Play Video</Text>
          </TouchableOpacity>
        ) : item.mediaType === 'file' && item.mediaUrl ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.mediaUrl!)}
            style={styles.fileMessageContainer}
          >
            <Text style={styles.fileIcon}>📄</Text>
            <View style={styles.fileDetails}>
              <Text style={styles.fileNameText} numberOfLines={1}>
                {item.fileName || 'Unknown File'}
              </Text>
              <Text style={styles.fileSizeText}>
                {item.fileSize ? formatFileSize(item.fileSize) : 'N/A'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {item.text ? (
          <Text style={isCurrentUser ? styles.myMessageText : styles.otherMessageText}>
            {item.text}
          </Text>
        ) : null}

        <Text style={styles.timestampText}>
          {item.createdAt?.toDate
            ? item.createdAt.toDate().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary }}>Loading messages...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={globalStyles.centeredContainer}>
        <Text style={globalStyles.errorText}>You must be logged in to view this chat.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AuthScreen')}>
          <Text style={globalStyles.loginPromptText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={KAV_OFFSET}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={globalStyles.backButton || globalStyles.primaryButton}
        >
          <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfileScreen', { userId: recipientId })}
          style={styles.profileButton}
        >
          <Image
            source={recipientProfilePic ? { uri: recipientProfilePic } : AVATAR_PLACEHOLDER}
            style={styles.recipientProfilePic}
          />
          <Text style={styles.headerTitle}>{recipientUsername}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: inputBarHeight + extraPanelHeight + insets.bottom + 12 },
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Attachment Options */}
      {showAttachmentOptions && (
        <View style={styles.attachmentOptionsContainer}>
          <TouchableOpacity
            onPress={() => handlePickMedia('image')}
            style={styles.attachmentOptionButton}
          >
            <Text style={styles.attachmentOptionButtonText}>📸 Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePickMedia('video')}
            style={styles.attachmentOptionButton}
          >
            <Text style={styles.attachmentOptionButtonText}>🎥 Video</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickFile} style={styles.attachmentOptionButton}>
            <Text style={styles.attachmentOptionButtonText}>📁 File</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          {fetchingEmojis ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <FlatList
              data={emojis.length > 0 ? emojis : FALLBACK_EMOJIS}
              keyExtractor={(item) => item}
              numColumns={8}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.emojiItem} onPress={() => handleSendEmoji(item)}>
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.emojiListContent}
            />
          )}
        </View>
      )}

      <View
        style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 25) }]}
        onLayout={(e) => setInputBarHeight(e.nativeEvent.layout.height)}
      >
        {isUploadingMedia ? (
          <View style={styles.mediaUploadIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.mediaUploadText}>Preparing upload...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setShowAttachmentOptions(!showAttachmentOptions)}
              style={styles.attachmentButton}
            >
              <Text style={styles.attachmentButtonText}>📎</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              style={styles.emojiButton}
            >
              <Text style={styles.emojiButtonText}>😊</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.textInput, { maxHeight: 120, textAlignVertical: 'top' }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type your message..."
              placeholderTextColor={colors.placeholderText}
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendText}
              disabled={newMessage.trim() === ''}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatRoomScreen;
