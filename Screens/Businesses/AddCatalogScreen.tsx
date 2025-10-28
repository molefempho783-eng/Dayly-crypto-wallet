import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { db, storage, auth } from '../../firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { useTheme } from '../context/ThemeContext';
import createStyles, { FONT_SIZES } from '../context/appStyles';
import { RootStackParamList, CatalogItem } from '../../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddCatalogScreen'>;
type AddCatalogScreenRouteProp = RouteProp<RootStackParamList, 'AddCatalogScreen'>;

// Local state for TextInputs
type LocalCatalogItem = {
  id?: string;
  name: string;
  price: string;
  description?: string;
  imageUri?: string;   // local file:// or https url for preview
  quantity?: string;
  category?: string;
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const isLocal = (u?: string) => !!u && !/^https?:\/\//i.test(u);
const sanitize = (s: string) =>
  (s || 'item').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase().slice(0, 60);

const AddCatalogScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors).addCatalogScreen;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddCatalogScreenRouteProp>();

  // Map incoming CatalogItem[] -> LocalCatalogItem[]
  const initialCatalog: LocalCatalogItem[] = (route.params?.catalog ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? '',
    price: (typeof item.price === 'number' ? item.price : Number(item.price || 0)).toString(),
    description: item.description ?? '',
    imageUri: item.imageUrl ?? undefined,
    quantity: (item.quantity ?? 1).toString(),
    category: item.category ?? '',
  }));

  const [catalog, setCatalog] = useState<LocalCatalogItem[]>(initialCatalog);
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState<LocalCatalogItem>({
    id: undefined,
    name: '',
    price: '',
    description: '',
    imageUri: undefined,
    quantity: '1',
    category: '',
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Please enable gallery access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewItem((prev) => ({ ...prev, imageUri: result.assets[0].uri }));
    }
  };

  const addItem = () => {
    if (!newItem.name.trim() || !newItem.price.trim()) {
      Alert.alert('Validation Error', 'Name and Price are required.');
      return;
    }
    const q = parseInt(newItem.quantity ?? '1', 10);
    if (!Number.isFinite(q) || q < 0) {
      Alert.alert('Validation Error', 'Quantity must be 0 or greater.');
      return;
    }

    setCatalog((prev) => [...prev, { ...newItem, id: newId() }]);

    setNewItem({
      id: undefined,
      name: '',
      price: '',
      description: '',
      imageUri: undefined,
      quantity: '1',
      category: '',
    });
  };

  const removeItem = (index: number) => {
    setCatalog((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAndReturn = async () => {
    const businessId = (route.params as any)?.businessId as string | undefined;

    try {
      setSaving(true);

      // Build final catalog; in edit flow upload local images to Storage first
      let finalCatalog: CatalogItem[];

      if (businessId) {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          Alert.alert('Auth required', 'Please sign in again.');
          setSaving(false);
          return;
        }

        finalCatalog = await Promise.all(
          catalog.map(async (item) => {
            let imageUrl = item.imageUri ?? '';
            if (isLocal(imageUrl)) {
              const res = await fetch(imageUrl);
              const blob = await res.blob();
              const filename = `${Date.now()}_${sanitize(item.name)}.jpg`;
              const storageRef = ref(storage, `business_catalog/${uid}/${businessId}/${filename}`);
              await uploadBytes(storageRef, blob);
              imageUrl = await getDownloadURL(storageRef);
            }

            return {
              id: item.id ?? newId(),
              name: (item.name ?? '').trim(),
              price:
                typeof item.price === 'string'
                  ? parseFloat(item.price.replace(',', '.')) || 0
                  : (item as any).price ?? 0,
              description: item.description ?? '',
              imageUrl,
              quantity: (() => {
                const n = parseInt(item.quantity ?? '1', 10);
                return Number.isFinite(n) ? n : 1;
              })(),
              category: (item.category ?? '').trim() || 'Uncategorized',
            };
          })
        );

        // Optional: sort by category then name
        finalCatalog.sort(
          (a, b) =>
            (a.category || '').localeCompare(b.category || '') ||
            a.name.localeCompare(b.name)
        );

        // Persist to Firestore (Edit flow)
        await updateDoc(doc(db, 'businesses', businessId), {
          catalog: finalCatalog,
          updatedAt: serverTimestamp(),
        });

        // 👉 Show alert first, then go back so it isn't swallowed by navigation
        Alert.alert('Saved', 'Catalog updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // Create flow (no businessId): just map and return to CreateBusinessScreen
      finalCatalog = catalog.map((item) => ({
        id: item.id ?? newId(),
        name: (item.name ?? '').trim(),
        price:
          typeof item.price === 'string'
            ? parseFloat(item.price.replace(',', '.')) || 0
            : (item as any).price ?? 0,
        description: item.description ?? '',
        imageUrl: item.imageUri ?? '',
        quantity: (() => {
          const n = parseInt(item.quantity ?? '1', 10);
          return Number.isFinite(n) ? n : 1;
        })(),
        category: (item.category ?? '').trim() || 'Uncategorized',
      }));

      navigation.navigate({
        name: 'CreateBusinessScreen',
        params: { catalog: finalCatalog },
        // @ts-ignore merge is valid at runtime
        merge: true,
      });
    } catch (e) {
      console.error('Failed to save catalog:', e);
      Alert.alert('Error', 'Could not save catalog. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Add Catalog Items</Text>

        {catalog.map((item, index) => (
          <View key={item.id ?? index} style={styles.catalogItem}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.catalogItemImage} />
            ) : (
              <Ionicons name="image-outline" size={FONT_SIZES.large} color={colors.primary} />
            )}
            <View style={styles.catalogItemTextContainer}>
              <Text style={styles.catalogItemName}>
                {item.name} - ${item.price}
              </Text>
              {!!item.category && (
                <Text style={styles.catalogItemDescription}>Category: {item.category}</Text>
              )}
              {!!item.quantity && (
                <Text style={styles.catalogItemDescription}>Qty: {item.quantity}</Text>
              )}
              {!!item.description && (
                <Text style={styles.catalogItemDescription}>{item.description}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => removeItem(index)}>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.subHeader}>New Item</Text>

        <TextInput
          style={styles.input}
          placeholder="Name *"
          placeholderTextColor="#9CA3AF"
          value={newItem.name}
          onChangeText={(text) => setNewItem((prev) => ({ ...prev, name: text }))}
        />

        <TextInput
          style={styles.input}
          placeholder="Category (e.g., Food, Drinks)"
          placeholderTextColor="#9CA3AF"
          value={newItem.category}
          onChangeText={(text) => setNewItem((prev) => ({ ...prev, category: text }))}
        />

        <TextInput
          style={styles.input}
          placeholder="Price *"
          placeholderTextColor="#9CA3AF"
          value={newItem.price}
          onChangeText={(text) => setNewItem((prev) => ({ ...prev, price: text }))}
          keyboardType="decimal-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Quantity (default 1)"
          placeholderTextColor="#9CA3AF"
          value={newItem.quantity}
          onChangeText={(text) => setNewItem((prev) => ({ ...prev, quantity: text }))}
          keyboardType="number-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Description"
          placeholderTextColor="#9CA3AF"
          value={newItem.description}
          onChangeText={(text) => setNewItem((prev) => ({ ...prev, description: text }))}
        />

        <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
          {newItem.imageUri ? (
            <Image source={{ uri: newItem.imageUri }} style={styles.imagePreview} />
          ) : (
            <Ionicons name="image-outline" size={FONT_SIZES.xlarge} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={addItem} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={saveAndReturn} style={styles.saveButton} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Done'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddCatalogScreen;
