import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import createStyles from '../context/appStyles';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
}

const BusinessChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const styles = createStyles(colors).businessChatScreen;

  const { businessId, businessName, coverImageUrl } = route.params;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Welcome to ${businessName || 'our business'}! How can I help you today?`,
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: generateBotResponse(input),
          sender: 'bot',
        },
      ]);
    }, 600);
  };

  const generateBotResponse = (question: string) => {
    const lower = question.toLowerCase();

    if (lower.includes('catalog') || lower.includes('menu')) {
      return "Sure! Here is our catalog:\n- Item A\n- Item B\n- Item C\n(Coming soon with real data!)";
    }
    if (lower.includes('price')) {
      return "Our prices are very affordable! Which item are you interested in?";
    }
    if (lower.includes('order')) {
      return "I can help confirm your order. Which item would you like?";
    }
    return "That's a great question! Let me assist you further.";
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.myMessageBubble : styles.otherMessageBubble,
      ]}
    >
      <Text
        style={
          item.sender === 'user' ? styles.myMessageText : styles.otherMessageText
        }
      >
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
<View style={styles.headerContainer}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
  </TouchableOpacity>

  {coverImageUrl ? (
    <Image source={{ uri: coverImageUrl }} style={styles.headerImage} />
  ) : (
    <View style={styles.headerImage}>
      <Text style={styles.headerImageText}>
        {businessName
          ? businessName
              .split(' ')
              .map((n:string) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()
          : '??'}
      </Text>
    </View>
  )}

  <Text style={styles.headerTitle} numberOfLines={1}>
    {businessName}
  </Text>
</View>


      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        inverted
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
          placeholderTextColor={colors.placeholderText}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color={colors.activeFilterText} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BusinessChatScreen;
