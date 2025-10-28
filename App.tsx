// App.tsx
import React, { useEffect, useRef } from "react";
import "react-native-gesture-handler";
import { Platform } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider, useTheme } from "./Screens/context/ThemeContext";

import AuthScreen from "./Screens/AuthScreen";
import CommunityScreen from "./Screens/Community/CommunityScreen";
import CommunityDetailScreen from "./Screens/Community/CommunityDetailScreen";
import CreateCommunityScreen from "./Screens/Community/CreateCommunityScreen";
import GroupChatScreen from "./Screens/Community/Group/GroupChatScreen";
import ProfileScreen from "./Screens/Users/ProfileScreen";
import UserProfileScreen from "./Screens/Users/userProfileScreen";
import EditCommunityScreen from "./Screens/Community/EditCommunityScreen";
import ChatRoomScreen from "./Screens/Users/ChatRoomScreen";
import GroupDetailsScreen from "./Screens/Community/Group/GroupDetailsScreen";
import WalletScreen from "./Screens/Wallet/WalletScreen";
import UserScreen from "./Screens/Users/UsersScreen";
import BusinessesScreen from "./Screens/Businesses/BusinessesScreen";
import CreateBusinessScreen from "./Screens/Businesses/CreateBusinessScreen";
import AddCatalogScreen from "./Screens/Businesses/AddCatalogScreen";
import EditBusinessScreen from "./Screens/Businesses/EditBusinessScreen";
import CatalogEditorScreen from "./Screens/Businesses/CatalogEditorScreen";
import BusinessChatScreen from "./Screens/Businesses/BusinessChatScreen";
import MyBusinessScreen from "./Screens/Businesses/MyBusinessScreen";
import CreateGroupChatScreen from "./Screens/Community/Group/CreateGroupChatScreen";
import EhailingScreen from "./Screens/ehailing/EhailingScreen";
import BeADriverScreen from "./Screens/ehailing/BeADriverScreen";
import ShopScreen from "./Screens/Businesses/ShopScreen";
import { registerForPushNotificationsAsync, savePushTokenToUser } from './hooks/useRegisterPushToken';
import { LogBox } from 'react-native';

// Add this line somewhere at the top level of your app
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested'
]);
// ---------- Global notifications handler (foreground behavior) ----------
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => {
    const isIOS = Platform.OS === "ios";
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // iOS 16+ additional flags:
      shouldShowBanner: isIOS, // show banner in foreground on iOS
      shouldShowList: isIOS,   // show in Notification Center list on iOS
    };
  },
});

// Android channel so alerts show properly in foreground
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
}

// Optional: strongly-typed route names if you keep a RootStackParamList
// type RootStackParamList = { ... }

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Global nav ref so we can navigate from push tap handlers
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

const TabsNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: "absolute",
          bottom: 0,
          height: 65,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse-outline";
          if (route.name === "CommunityScreen") iconName = "people-outline";
          else if (route.name === "BusinessesScreen") iconName = "storefront-outline";
          else if (route.name === "WalletScreen") iconName = "wallet-outline";
          else if (route.name === "UserScreen") iconName = "person-outline";
          else if (route.name === "EhailingScreen") iconName = "car-outline";
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CommunityScreen" component={CommunityScreen} />
      <Tab.Screen name="UserScreen" component={UserScreen} />
      <Tab.Screen name="BusinessesScreen" component={BusinessesScreen} />
      <Tab.Screen name="WalletScreen" component={WalletScreen} />
      <Tab.Screen name="EhailingScreen" component={EhailingScreen} />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  const { user } = useAuth();

 // ----- [ADDED] Handle taps on received notifications -----
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped, data:', data);

      // --- Logic to navigate to the correct screen ---
      if (data?.type === 'dm' && data.chatId && data.recipientId) {
        // Ensure navigation container is ready before navigating
        if (navigationRef.current) {
          navigationRef.current.navigate('ChatRoomScreen', {
            chatId: data.chatId as string,
            // recipientId here is the person who sent the message
            recipientId: data.recipientId as string,
          });
        }
      }
    });

    // Handle case where app is opened from a killed state via notification
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
         const data = response.notification.request.content.data;
          if (data?.type === 'dm' && data.chatId && data.recipientId) {
            // Use a small timeout to ensure the navigator is ready
            setTimeout(() => {
              if (navigationRef.current) {
                navigationRef.current.navigate('ChatRoomScreen', {
                  chatId: data.chatId as string,
                  recipientId: data.recipientId as string,
                });
              }
            }, 1000);
          }
      }
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
  // ----- [END ADDED SECTION] -----

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      const token = await registerForPushNotificationsAsync();
      if (mounted && token) await savePushTokenToUser(token);
    })();
    return () => { mounted = false; };
  }, [user]);


  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <RootStack.Screen name="Tabs" component={TabsNavigator} />

              {/* Screens without the bottom tab bar */}
              <RootStack.Screen name="GroupChatScreen" component={GroupChatScreen} />
              <RootStack.Screen name="ChatRoomScreen" component={ChatRoomScreen} />
              <RootStack.Screen name="CommunityDetailScreen" component={CommunityDetailScreen} />
              <RootStack.Screen name="EditCommunityScreen" component={EditCommunityScreen} />
              <RootStack.Screen name="UserProfileScreen" component={UserProfileScreen} />
              <RootStack.Screen name="GroupDetailsScreen" component={GroupDetailsScreen} />
              <RootStack.Screen name="CreateCommunityScreen" component={CreateCommunityScreen} />
              <RootStack.Screen name="CreateBusinessScreen" component={CreateBusinessScreen} />
              <RootStack.Screen name="AddCatalogScreen" component={AddCatalogScreen} />
              <RootStack.Screen name="EditBusinessScreen" component={EditBusinessScreen} />
              <RootStack.Screen name="CatalogEditorScreen" component={CatalogEditorScreen} />
              <RootStack.Screen name="BusinessChatScreen" component={BusinessChatScreen} />
              <RootStack.Screen name="MyBusinessScreen" component={MyBusinessScreen} />
              <RootStack.Screen name="CreateGroupChatScreen" component={CreateGroupChatScreen} />
              <RootStack.Screen name="BeADriverScreen" component={BeADriverScreen} />
              <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
              <RootStack.Screen name="ShopScreen" component={ShopScreen} />
            </>
          ) : (
            <RootStack.Screen name="AuthScreen" component={AuthScreen} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
};

const App = () => (
  <AuthProvider>
    <MainNavigator />
  </AuthProvider>
);

export default App;
