import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Community, RootStackParamList } from "../../types";
import { collection, addDoc } from "firebase/firestore";
import { db, auth, storage } from "../../firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import createStyles, { FONT_SIZES, SPACING } from "../context/appStyles";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_COMMUNITY_LOGO = require("../../assets/community-placeholder.png");

type NavigationProp = StackNavigationProp<RootStackParamList, "CreateCommunityScreen">;
type PlaceSuggestion = { place_id: string; description: string };

const CreateCommunityScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isThemeLoading } = useTheme();

  const styles = createStyles(colors).createCommunityScreen;
  const globalStyles = createStyles(colors).global;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [communityLogoUri, setCommunityLogoUri] = useState<string | null>(null);
const [locationAddress, setLocationAddress] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
 const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null); 
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState("");
  const [isPickingImage, setIsPickingImage] = useState(false);

  const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  /* ----------------------------------------------------------------
   * Image picker
   * ---------------------------------------------------------------*/
  const handleImagePick = async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to pick an image.");
      setIsPickingImage(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setCommunityLogoUri(result.assets[0].uri);
    }
    setIsPickingImage(false);
  };

  /* ----------------------------------------------------------------
   * Google Places Autocomplete (same logic as EhailingScreen)
   * ---------------------------------------------------------------*/
  async function fetchSuggestions(text: string): Promise<PlaceSuggestion[]> {
    if (!GOOGLE_KEY || !text.trim()) return [];
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      text
    )}&key=${GOOGLE_KEY}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return (data?.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
      }));
    } catch {
      return [];
    }
  }

  async function getPlaceLatLng(place_id: string): Promise<{ lat: number; lng: number } | null> {
    if (!GOOGLE_KEY) return null;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data?.result?.geometry?.location;
      if (!loc) return null;
      return { lat: loc.lat, lng: loc.lng };
    } catch {
      return null;
    }
  }
const handleLocationChange = async (text: string) => {
    setLocationAddress(text);
    setSelectedPlaceId(null); // <-- ADD THIS to clear the old ID
    if (text.trim().length > 1) {
      const results = await fetchSuggestions(text);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectLocation = (s: PlaceSuggestion) => {
    setLocationAddress(s.description);
    setSelectedPlaceId(s.place_id);
    setSuggestions([]);
  };

const validateLocation = async (): Promise<boolean> => {
    const locationText = locationAddress.trim();

    // Case 1: Location is empty. This is valid (it's optional).
    if (!locationText) {
      return true;
    }

    // Case 2: Location is NOT empty, but no ID was stored.
    // This means the user typed "New York" but didn't click a suggestion.
    if (locationText && !selectedPlaceId) {
      Alert.alert("Invalid location", "Please choose a valid location from the suggestions.");
      return false;
    }
    
    // Case 3: Location and ID are set. We are good.
    return true;
  };


  /* ----------------------------------------------------------------
   * Firebase upload and save
   * ---------------------------------------------------------------*/
  const uploadImageToFirebase = async (uri: string, communityId: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `community_logos/${communityId}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Upload failed", err);
      Alert.alert("Error", "Failed to upload image.");
      return null;
    }
  };

  const handleCreateCommunity = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Community name is required.");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to create a community.");
      return;
    }
    const isValid = await validateLocation();
    if (!isValid) return;

    setLoading(true);

    const categoriesArray = categories
      .split(',') // Split by comma
      .map(cat => cat.trim()) // Remove whitespace
      .filter(cat => cat.length > 0) // Remove empty strings
      .map(cat => cat.toLowerCase()); // Optional: normalize data

    const tempId = `${auth.currentUser.uid}_${Date.now()}`;

    let logoUrl: string | null = null;
    if (communityLogoUri) {
      logoUrl = await uploadImageToFirebase(communityLogoUri, tempId);
      if (!logoUrl) {
        setLoading(false);
        return;
      }
    }

    try {
      const docRef = await addDoc(collection(db, "communities"), {
        name,
        description: description.trim() || undefined,
        location: locationAddress.trim() || undefined,
        categories: categoriesArray.length > 0 ? categoriesArray : undefined, 
        createdBy: auth.currentUser.uid,
        createdAt: new Date(),
        logo: logoUrl || undefined,
      });

      Alert.alert("Success", "Community created successfully!");
      navigation.navigate("CommunityDetailScreen", {
        community: {
          id: docRef.id,
          name,
          description: description.trim() || undefined,
          location: locationAddress.trim() || undefined, // Using locationAddress
          categories: categoriesArray.length > 0 ? categoriesArray : undefined, // <-- ADD THIS
          logo: logoUrl || undefined,
          createdBy: auth.currentUser.uid,
          createdAt: new Date(),
        },
      });
      setName("");
      setDescription("");
      setLocationAddress("");
      setCategories(""); 
      setSelectedPlaceId(null);
      setCommunityLogoUri(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create community.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------
   * UI
   * ---------------------------------------------------------------*/
  if (isThemeLoading) {
    return (
      <View style={globalStyles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingOverlayText}>Loading theme...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {loading && (
          <View style={styles.loadingOverlayScreen}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingOverlayText}>Creating community...</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.large }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={globalStyles.backButton || globalStyles.primaryButton}
          >
            <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.header}>Create a New Community</Text>

          {/* Logo Picker */}
          <TouchableOpacity onPress={handleImagePick} style={styles.logoContainer}>
            <Image
              source={communityLogoUri ? { uri: communityLogoUri } : DEFAULT_COMMUNITY_LOGO}
              style={styles.logoImage}
            />
            <Text style={styles.addLogoText}>{communityLogoUri ? "Change Logo" : "Add Logo"}</Text>
          </TouchableOpacity>

          {/* Name */}
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            placeholder="Community Name"
            placeholderTextColor={colors.placeholderText as string}
            value={name}
            onChangeText={setName}
          />

          {/* Description */}
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.placeholderText as string}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Categories */}
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            placeholder="Categories (e.g., tech, gaming, sports)"
            placeholderTextColor={colors.placeholderText as string}
            value={categories}
            onChangeText={setCategories}
            autoCapitalize="none" // Good for categories/tags
          />

          {/* Location (with suggestions) */}
          
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text, marginBottom: 0 },
            ]}
            placeholder="Location (optional)"
            placeholderTextColor={colors.placeholderText as string}
            value={locationAddress}
            onChangeText={handleLocationChange}
          />

          {suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.borderColor,
                borderWidth: 1,
                marginHorizontal:0,
                borderRadius: 10,
                marginBottom: 10,
              }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectLocation(item)} style={{ padding: 10 }}>
                  <Text style={{ color: colors.text }}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Create Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleCreateCommunity}>
            {loading ? (
              <ActivityIndicator color={colors.activeFilterText} />
            ) : (
              <Text style={styles.saveButtonText}>Create Community</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default CreateCommunityScreen;
