// Screens/Communities/CommunityScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Community } from "../../types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useTheme } from '../context/ThemeContext';
import createStyles, { FONT_SIZES } from '../context/appStyles';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
const DEFAULT_COMMUNITY_LOGO = require("../../assets/community-placeholder.png");

type NavigationProp = StackNavigationProp<RootStackParamList, "ChatScreen">;

interface CommunityListItem extends Community {
  id: string;
}

const CommunityScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const styles = createStyles(colors).communityScreen;
  const globalStyles = createStyles(colors).global;

  const [communities, setCommunities] = useState<CommunityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
const [userCity, setUserCity] = useState<string | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [allCategories, setAllCategories] = useState<string[]>([]); 

useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collection(db, "communities"));
        const results: CommunityListItem[] = [];
        const categoriesSet = new Set<string>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const categories: string[] = data.categories || [];
          categories.forEach(cat => categoriesSet.add(cat));
          results.push({
            id: docSnap.id,
            name: data.name || "Unnamed Community",
            description: data.description || "",
            logo: data.logo || undefined,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
            location: data.location || undefined, 
            categories: categories, 
          });
        });
        results.sort((a, b) => a.name.localeCompare(b.name));
        setCommunities(results);

        // --- SET THE UNIQUE, SORTED CATEGORIES ---
        const sortedCategories = Array.from(categoriesSet).sort();
        setAllCategories(sortedCategories);

      } catch (err) {
        console.error("Error fetching communities:", err);
        setError("Failed to load communities. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, []);


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
          // You should move this token to an environment variable
          const resp = await fetch('https://ipinfo.io/json?token=9f064f7b5ecf4d');
          const data = await resp.json();
          city = data.city || data.region || null;
        }
        setUserCity(city);
      } catch (err) {
        console.error("Error getting location:", err);
        setUserCity(null);
      }
    };
    getLocation();
  }, []);

  const handleOpenCommunity = (community: CommunityListItem) => {
    navigation.navigate("CommunityDetailScreen", { community });
  };

const filteredCommunities = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    // 1. Filter by search query and category first
 let filtered = communities.filter((community) => {
      const searchMatch = !normalizedQuery || (
        community.name.toLowerCase().includes(normalizedQuery) ||
        (community.description?.toLowerCase().includes(normalizedQuery) ?? false)
      );

const categoryMatch = !selectedCategory ||
        (community.categories?.includes(selectedCategory) ?? false);
      return searchMatch && categoryMatch;
    });

    // 2. If we have a user's city, prioritize local communities
    if (userCity) {
      const normalizedCity = userCity.toLowerCase();
      
      const localCommunities = filtered.filter(c => 
        c.location?.toLowerCase().includes(normalizedCity)
      );
      const restCommunities = filtered.filter(c => 
        !c.location?.toLowerCase().includes(normalizedCity)
      );
      
      return [...localCommunities, ...restCommunities];
    }

    // 3. If no city, return the standard filtered list
    return filtered;

  }, [communities, searchQuery, selectedCategory, userCity]); // Add all dependencies

  const Wrapper = Platform.OS === 'web'
    ? View
    : require('react-native').SafeAreaView || View;

  return (
    <Wrapper style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>Communities</Text>
        </View>

        <TextInput
          style={styles.searchBar}
          placeholder="Search communities..."
          placeholderTextColor={colors.placeholderText as string}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

      {/* --- ADD THIS CATEGORY FlatList --- */}
        <View style={styles.categoryListContainer}>
          <FlatList
            data={["All", ...allCategories]} // Add "All" to the start
            renderItem={({ item: category }) => {
              const isAllButton = category === "All";
              const isActive = (isAllButton && selectedCategory === null) || (selectedCategory === category);
              
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    isActive && styles.categoryButtonActive
                  ]}
                  onPress={() => {
                    setSelectedCategory(isAllButton ? null : category);
                  }}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    isActive && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }} // Add some padding
          />
        </View>
{/* Add the location display text */}
        {userCity && (
          <Text       style={{
                      textAlign: 'center',
                      color: colors.primary,
                      fontWeight: 'bold',
                      fontSize: FONT_SIZES.medium,
                      marginTop: 6,
                      marginBottom: 8
                    }}>
            Showing Communities near you in {userCity}
          </Text>
        )}
        {/* --- END OF MODIFICATION --- */}
        {error && (
          <Text style={[globalStyles.loadingOverlayText, { color: colors.error }]}> 
            {error}
          </Text>
        )}

        {loading ? (
          <View style={styles.activityIndicatorContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading communities...</Text>
          </View>
        ) : (
          <FlatList
            nestedScrollEnabled
            style={styles.scrollViewContent}
            data={filteredCommunities}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.communityListRow}
            renderItem={({ item }) => {
              // compute initials fallback
              const initials = item.name
                .split(' ')
                .map(w => w[0])
                .join('')
                .substring(0,2)
                .toUpperCase();

              return (
                <TouchableOpacity
                  style={styles.communityCard}
                  onPress={() => handleOpenCommunity(item)}
                >
                  {item.logo ? (
                    <Image
                      source={{ uri: item.logo }}
                      style={styles.communityLogo}
                    />
                  ) : (
                    <View
                      style={{
                        width: styles.communityLogo.width,
                        height: styles.communityLogo.height,
                        borderRadius: styles.communityLogo.width / 2,
                        backgroundColor: colors.primaryLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: FONT_SIZES.large,
                          fontWeight: 'bold',
                        }}
                      >
                        {initials}
                      </Text>
                    </View>
                  )}
                  <View style={styles.communityCardContent}>
                    <Text style={styles.communityCardTitle}>{item.name}</Text>
                    <Text style={styles.lastMessagePreview} numberOfLines={1}>
                      {item.description || "No description available."}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.noResultsText}>No communities found.</Text>
            }
          />
        )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateCommunityScreen")}
      >
        <Ionicons name="add" size={32} color={colors.buttonText} />
      </TouchableOpacity>
    </Wrapper>
  );
};

export default CommunityScreen;
