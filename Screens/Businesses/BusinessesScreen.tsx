import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Image,
  SafeAreaView,
  Platform
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";
import { collection, query, orderBy, onSnapshot, FieldValue } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from '../context/ThemeContext';
import createStyles, { FONT_SIZES } from '../context/appStyles';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import * as Location from 'expo-location';

interface Business {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  coverImageUrl?: string | null; // legacy; some screens may still use it
  location: string;
  type: string;
  ownerId: string;
  createdAt: FieldValue;
}

type BusinessesScreenNavigationProp = StackNavigationProp<RootStackParamList, "BusinessesScreen">;

const BusinessesScreen = () => {
  const navigation = useNavigation<BusinessesScreenNavigationProp>();
  const { theme, colors, toggleTheme } = useTheme();
  const styles = createStyles(colors).businessesScreen;
  const globalStyles = createStyles(colors).global;

  // Data states
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Tab state
  const [index, setIndex] = useState(0);
  const [routes, setRoutes] = useState([{ key: 'explore', title: 'Explore' }]);

  // Geo state
  const [userCity, setUserCity] = useState<string | null>(null);

  // 🔴 Real-time listener while screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);

      // If not all docs have createdAt, order by 'name' is safe
      const q = query(collection(db, "businesses"), orderBy("name", "asc"));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const fetched: Business[] = snapshot.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<Business, "id">),
          }));
          setAllBusinesses(fetched);

          const hasMyBusiness = fetched.some(b => b.ownerId === auth.currentUser?.uid);
          setRoutes(
            hasMyBusiness
              ? [{ key: 'explore', title: 'Explore' }, { key: 'myBusiness', title: 'My Business' }]
              : [{ key: 'explore', title: 'Explore' }]
          );

          setLoading(false);
        },
        (err) => {
          setError(`Failed to load businesses: ${err.message || "Please try again."}`);
          setLoading(false);
        }
      );

      return () => unsub();
    }, [])
  );

  // Get User City (GPS -> IP Fallback)
  useEffect(() => {
    const getLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        let city: string | null = null;
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          let [place] = await Location.reverseGeocodeAsync(location.coords);
          city = place?.city || place?.region || null;
        }
        if (!city) {
          const resp = await fetch('https://ipinfo.io/json?token=9f064f7b5ecf4d');
          const data = await resp.json();
          city = data.city || data.region || null;
        }
        setUserCity(city);
      } catch {
        setUserCity(null);
      }
    };
    getLocation();
  }, []);

  // Memoized filtered and sorted data (city match prioritized)
  const displayedBusinesses = useMemo(() => {
    let filtered = allBusinesses.filter(b =>
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (userCity) {
      const local = filtered.filter(b =>
        b.location?.toLowerCase().includes(userCity.toLowerCase())
      );
      const rest = filtered.filter(b =>
        !b.location?.toLowerCase().includes(userCity.toLowerCase())
      );
      return [...local, ...rest];
    }
    return filtered;
  }, [allBusinesses, searchQuery, userCity]);

  const myBusinesses = useMemo(
    () => allBusinesses.filter(b => b.ownerId === auth.currentUser?.uid),
    [allBusinesses]
  );

  // Render business card
  const renderBusinessItem = ({ item }: { item: Business }) => {
    const initials = item.name
      ? item.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      : '??';

    const cover = item.imageUrl ?? item.coverImageUrl ?? undefined;

    return (
      <TouchableOpacity
        style={styles.businessCard}
        onPress={() => {
          if (item.ownerId === auth.currentUser?.uid) {
            navigation.navigate("MyBusinessScreen", {
              businessId: item.id,
              businessName: item.name,
              coverImageUrl: cover || null,
              description: item.description,
              location: item.location,
              type: item.type,
            });
          } else {
            navigation.navigate('ShopScreen', { businessId: item.id, businessName: item.name });
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.businessImageContainer}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.businessImage} />
          ) : (
            <View style={styles.businessInitialsFallback}>
              <Text style={styles.businessInitialsText}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{item.name}</Text>
          <Text style={styles.businessDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.businessMeta} numberOfLines={1}>{item.location}</Text>
            <Ionicons name="pricetag-outline" size={16} color={colors.secondaryText} style={{ marginLeft: 10 }} />
            <Text style={styles.businessMeta} numberOfLines={1}>{item.type}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  // Create business
  const handleCreateBusiness = () => {
    navigation.navigate("CreateBusinessScreen", {});
  };

  // Explore tab
  const ExploreRoute = () => (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search businesses, location, type..."
        placeholderTextColor={colors.placeholderText as string}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="always"
        returnKeyType="search"
        underlineColorAndroid="transparent"
        blurOnSubmit={false}
      />

      {userCity && (
        <Text
          style={{
            textAlign: 'center',
            color: colors.primary,
            fontWeight: 'bold',
            fontSize: FONT_SIZES.medium,
            marginTop: 6,
            marginBottom: 8
          }}
        >
          Showing businesses near you in {userCity}
        </Text>
      )}

      {error && <Text style={globalStyles.errorText}>{error}</Text>}

      {loading ? (
        <View style={globalStyles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading businesses...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedBusinesses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusinessItem}
          contentContainerStyle={styles.flatListContent}
          style={styles.flatListStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.noResultsText}>No businesses found.</Text>}
        />
      )}
    </View>
  );

  const MyBusinessRoute = () => (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={globalStyles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : myBusinesses.length > 0 ? (
        <FlatList
          data={myBusinesses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusinessItem}
          contentContainerStyle={styles.flatListContent}
          style={styles.flatListStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <Text style={styles.noResultsText}>
          You don't own any businesses yet. Tap + to create one.
        </Text>
      )}
    </View>
  );

  const renderScene = SceneMap({
    explore: ExploreRoute,
    myBusiness: MyBusinessRoute,
  });

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Businesses</Text>
        <View style={styles.themeToggleContainer}>
          <Text style={styles.themeToggleText}>Dark Mode</Text>
          <Switch
            trackColor={{ false: colors.secondaryText, true: colors.primary }}
            thumbColor={colors.cardBackground}
            ios_backgroundColor={colors.secondaryText}
            onValueChange={toggleTheme}
            value={theme === 'dark'}
          />
        </View>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
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

      <TouchableOpacity style={styles.fab} onPress={handleCreateBusiness}>
        <Ionicons name="add-outline" size={FONT_SIZES.xxlarge} color={colors.buttonText} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default BusinessesScreen;
