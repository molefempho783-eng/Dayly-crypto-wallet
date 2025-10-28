import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, CatalogItem } from '../../types';
import { useTheme } from '../context/ThemeContext';
import createStyles, { FONT_SIZES } from '../context/appStyles';
import { db, storage, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';

type EditBusinessRouteProp = RouteProp<RootStackParamList, 'EditBusinessScreen'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'EditBusinessScreen'>;

const EditBusinessScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors).createBusinessScreen;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditBusinessRouteProp>();

  const { businessId } = route.params;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageChanged, setCoverImageChanged] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the business once
  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const docRef = doc(db, 'businesses', businessId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          Alert.alert('Error', 'Business not found.');
          navigation.goBack();
          return;
        }
        const data = snap.data();
        setName(data.name || '');
        setDescription(data.description || '');
        setType(data.type || '');
        setLocation(data.location || '');
        setCoverImageUri(data.imageUrl || null);
        setCatalog(data.catalog || []);
      } catch (err) {
        console.error('Error loading business:', err);
        Alert.alert('Error', 'Failed to load business.');
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [businessId, navigation]);

  // If we returned from CatalogEditorScreen with a new catalog, reflect it
  useEffect(() => {
    if (route.params?.catalog) {
      setCatalog(route.params.catalog);
    }
  }, [route.params?.catalog]);

  const pickCoverImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission denied', 'Please enable gallery access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCoverImageUri(result.assets[0].uri);
      setCoverImageChanged(true);
    }
  };

  const uploadImageToFirebase = async (uri: string, path: string) => {
    const res = await fetch(uri);
    const blob = await res.blob();
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  };

  const handleSave = async () => {
    if (!name.trim() || !type.trim() || !location.trim()) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Auth required', 'Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      let newCoverUrl = coverImageUri;

      if (coverImageUri && coverImageChanged) {
        const filename = `${businessId}_${Date.now()}.jpg`;
        newCoverUrl = await uploadImageToFirebase(
          coverImageUri,
          `business_covers/${uid}/${filename}`
        );
      }

       const updatedDoc = {
      name: name.trim(),
      description: description ?? '',
      type: type.trim(),
      location: location.trim(),
      imageUrl: newCoverUrl ?? null,
      catalog, // whatever is currently in state
    };

    Alert.alert('Success', 'Business updated!');

    navigation.replace('MyBusinessScreen', {
      businessId,
      businessName: updatedDoc.name,
      coverImageUrl: updatedDoc.imageUrl, // MyBusinessScreen expects "coverImageUrl"
      description: updatedDoc.description,
      location: updatedDoc.location,
      type: updatedDoc.type,
      catalog: updatedDoc.catalog,
    });    } catch (e) {
      console.error('Error updating business:', e);
      Alert.alert('Error', 'Failed to update business.');
    } finally {
      setLoading(false);
    }
  };

  const openCatalogEditor = () => {
    navigation.navigate('CatalogEditorScreen', {
      businessId,
      businessName: name,
      coverImageUrl: coverImageUri ?? null,
      description,
      location,
      type,
      catalog,
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- Small horizontal card for each catalog item ---
  const renderCatalogCard = ({ item }: { item: CatalogItem }) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    const cat = (item as any).category ?? '';

    return (
      <View
        style={{
          width: 180,
          backgroundColor: colors.cardBackground,
          borderRadius: 14,
          padding: 10,
          marginRight: 12,
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: 110, borderRadius: 10, marginBottom: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 110,
              borderRadius: 10,
              marginBottom: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#00000010',
            }}
          >
            <Ionicons name="image-outline" size={28} color={colors.secondaryText} />
          </View>
        )}

        <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700' }}>
          {item.name || 'Untitled'}
        </Text>

        {!!cat && (
          <Text numberOfLines={1} style={{ color: colors.secondaryText, fontSize: 12, marginTop: 2 }}>
            {cat}
          </Text>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            R{Number(item.price ?? 0).toFixed(2)}
          </Text>
          <Text style={{ color: qty > 0 ? colors.secondaryText : colors.error, fontSize: 12 }}>
            {qty > 0 ? `Stock: ${qty}` : 'Out'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
           {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  paddingBottom: 20,
                }}
              >
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
                  <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: FONT_SIZES.large,
                    fontWeight: "700",
                    color: colors.textPrimary,
                  }}
                >
                  Edit Business
                </Text>
                </View>
                  
        <Text style={styles.label}>Business Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.input} value={description} onChangeText={setDescription} />

        <Text style={styles.label}>Type *</Text>
        <TextInput style={styles.input} value={type} onChangeText={setType} />

        <Text style={styles.label}>Location *</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Cover Image</Text>
        <TouchableOpacity onPress={pickCoverImage} style={styles.imagePicker}>
          {coverImageUri ? (
            <Image source={{ uri: coverImageUri }} style={styles.imagePreview} />
          ) : (
            <Ionicons name="image-outline" size={FONT_SIZES.xlarge} color={colors.primary} />
          )}
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Catalog / Menu Items</Text>

        {catalog.length === 0 ? (
          <Text style={styles.catalogDescription}>No items yet. Tap below to add or edit.</Text>
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(item, index) => item.id ?? String(index)}
            renderItem={renderCatalogCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}

        <TouchableOpacity onPress={openCatalogEditor} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add / Edit Catalog Items</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSave} style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditBusinessScreen;
