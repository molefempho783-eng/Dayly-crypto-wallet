import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, CatalogItem } from '../../types';
import { useTheme } from '../context/ThemeContext';
import createStyles from '../context/appStyles';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { db, auth, storage } from '../../firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type NavProp = StackNavigationProp<RootStackParamList, 'CatalogEditorScreen'>;
type RoutePropType = RouteProp<RootStackParamList, 'CatalogEditorScreen'>;

type LocalCatalogItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string; // can be local (file://, content://) or https after upload
  quantity: number;
  category: string;
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const isLocalUri = (uri?: string) =>
  !!uri && (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('data:'));

const slug = (s: string) =>
  (s || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const CatalogEditorScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors).createBusinessScreen;

  const {
    businessId,
    businessName,
    coverImageUrl,
    description,
    location,
    type,
    catalog: initialCatalog = [],
  } = route.params;

  // Normalize incoming items, guarantee stable ids
  const normalizedInitial: LocalCatalogItem[] = useMemo(
    () =>
      (initialCatalog as CatalogItem[]).map((it) => ({
        id: (it.id as string) ?? newId(),
        name: it.name ?? '',
        price: typeof it.price === 'number' ? it.price : Number(it.price || 0),
        description: it.description ?? '',
        imageUrl: it.imageUrl ?? '',
        quantity: typeof (it as any).quantity === 'number' ? (it as any).quantity : 1,
        category: (it as any).category ?? '',
      })),
    [initialCatalog]
  );

  const [catalog, setCatalog] = useState<LocalCatalogItem[]>(normalizedInitial);
  const [showAll, setShowAll] = useState(false);

  // Modal editor
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocalCatalogItem>({
    id: newId(),
    name: '',
    price: 0,
    description: '',
    imageUrl: '',
    quantity: 1,
    category: '',
  });

  // Saving overlay + navigation guard while saving
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!saving) return;
      e.preventDefault(); // block leaving while saving
    });
    return unsub;
  }, [navigation, saving]);

  const openAddEditor = () => {
    setEditingId(null);
    setDraft({
      id: newId(),
      name: '',
      price: 0,
      description: '',
      imageUrl: '',
      quantity: 1,
      category: '',
    });
    setEditorVisible(true);
  };

  const openEditEditorById = (id: string) => {
    const it = catalog.find((c) => c.id === id);
    if (!it) return;
    setEditingId(id);
    setDraft({ ...it });
    setEditorVisible(true);
  };

  const closeEditor = () => setEditorVisible(false);

  const pickDraftImage = async () => {
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
      setDraft((prev) => ({ ...prev, imageUrl: result.assets[0].uri }));
    }
  };

  const saveDraft = () => {
    if (!draft.name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }
    if (Number.isNaN(draft.price)) {
      Alert.alert('Validation Error', 'Price must be a number.');
      return;
    }
    if (draft.quantity < 0) {
      Alert.alert('Validation Error', 'Quantity cannot be negative.');
      return;
    }

    setCatalog((prev) => {
      if (editingId === null) {
        return [...prev, { ...draft }];
      }
      return prev.map((it) => (it.id === editingId ? { ...draft, id: editingId } : it));
    });

    setEditorVisible(false);
  };

  const deleteById = (id: string) => {
    Alert.alert('Delete item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setCatalog((prev) => prev.filter((it) => it.id !== id)),
      },
    ]);
  };

  // Upload local images (if needed) and return HTTPS URL (or original if already uploaded)
  const uploadIfNeeded = async (
    uri: string,
    uid: string,
    bizId: string,
    itemName: string
  ): Promise<string> => {
    if (!isLocalUri(uri)) return uri; // already https or empty
    const filename = `${Date.now()}_${slug(itemName || 'item')}.jpg`;
    const path = `business_catalog/${uid}/${bizId}/${filename}`;
    const res = await fetch(uri);
    const blob = await res.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSaveCatalog = async () => {
    if (editorVisible) {
      Alert.alert('Unsaved item', 'Please save or cancel the item you’re editing first.');
      return;
    }

    for (const item of catalog) {
      if (!item.name.trim()) {
        Alert.alert('Validation Error', 'Every item needs a name.');
        return;
      }
      if (Number.isNaN(Number(item.price))) {
        Alert.alert('Validation Error', 'Prices must be numbers.');
        return;
      }
      if (item.quantity < 0) {
        Alert.alert('Validation Error', 'Quantity can’t be negative.');
        return;
      }
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Auth required', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      // Upload all local images in parallel, replace with HTTPS URLs
      const uploaded = await Promise.all(
        catalog.map(async (c) => {
          const url = c.imageUrl ? await uploadIfNeeded(c.imageUrl, uid, businessId, c.name) : '';
          return {
            id: c.id,
            name: c.name.trim(),
            price: Number(c.price) || 0,
            description: c.description || '',
            imageUrl: url || '', // https or empty
            quantity: Number(c.quantity) || 0,
            category: c.category?.trim() || '',
          } as CatalogItem;
        })
      );

      await updateDoc(doc(db, 'businesses', businessId), {
        catalog: uploaded,
        updatedAt: serverTimestamp(),
      });

      // Navigate back to EditBusinessScreen with fresh catalog so UI updates immediately
      navigation.navigate({
        name: 'EditBusinessScreen',
        params: {
          businessId,
          businessName,
          coverImageUrl,
          description,
          location,
          type,
          catalog: uploaded,
        },
        // @ts-ignore: merge is valid at runtime
        merge: true,
      });

      Alert.alert('Saved', 'Catalog updated.');
    } catch (e: any) {
      console.error('Save catalog failed', e);
      Alert.alert('Error', e?.message || 'Failed to save catalog.');
    } finally {
      setSaving(false);
    }
  };

  // Grid (2×5 by default)
  const gridData: LocalCatalogItem[] = useMemo(
    () => (showAll ? catalog : catalog.slice(0, 10)),
    [catalog, showAll]
  );

  const renderGridCard = ({ item }: { item: LocalCatalogItem }) => {
    const qty = Number(item.quantity ?? 0);
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.cardBackground,
          borderRadius: 14,
          padding: 10,
          margin: 6,
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: 90, borderRadius: 10, marginBottom: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 90,
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

        {!!item.category && (
          <Text numberOfLines={1} style={{ color: colors.secondaryText, fontSize: 12, marginTop: 2 }}>
            {item.category}
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

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => openEditEditorById(item.id)}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingVertical: 8,
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            <Text style={{ color: colors.buttonText, fontWeight: '700' }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => deleteById(item.id)}
            style={{
              width: 44,
              height: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#00000012',
            }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.header}>Edit Catalog / Menu</Text>

        {/* Grid header + toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>
            Catalog overview
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {catalog.length > 10 && (
              <TouchableOpacity onPress={() => setShowAll((s) => !s)} style={{ marginRight: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {showAll ? 'Show 10' : `Show all (${catalog.length})`}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={openAddEditor}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2-column grid */}
        <FlatList
          data={gridData}
          keyExtractor={(it) => it.id}
          renderItem={renderGridCard}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 6 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.secondaryText, marginVertical: 8 }}>
              No items yet. Tap “+ Add Item”.
            </Text>
          }
        />

        {/* Save all changes */}
        <TouchableOpacity
          onPress={handleSaveCatalog}
          style={[styles.submitButton, saving && { opacity: 0.6 }]}
          disabled={saving}
        >
          <Text style={styles.submitButtonText}>Save Catalog</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Editor */}
      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top + 12}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '92%',
                paddingTop: 12,
                paddingHorizontal: 16,
                paddingBottom: 16 + insets.bottom,
              }}
            >
              <ScrollView
                contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                    {editingId === null ? 'Add Item' : 'Edit Item'}
                  </Text>
                  <TouchableOpacity onPress={closeEditor}>
                    <Ionicons name="close" size={24} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>

                {/* Image picker */}
                <TouchableOpacity
                  onPress={pickDraftImage}
                  style={{
                    height: 140,
                    borderRadius: 12,
                    backgroundColor: '#00000012',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  {draft.imageUrl ? (
                    <Image
                      source={{ uri: draft.imageUrl }}
                      style={{ width: '100%', height: '100%', borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="image-outline" size={36} color={colors.secondaryText} />
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Item Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Beef Burger"
                  placeholderTextColor="#9CA3AF"
                  value={draft.name}
                  onChangeText={(t) => setDraft((p) => ({ ...p, name: t }))}
                />

                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Food / Drinks / Clothing"
                  placeholderTextColor="#9CA3AF"
                  value={draft.category}
                  onChangeText={(t) => setDraft((p) => ({ ...p, category: t }))}
                />

                <Text style={styles.label}>Price (R)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 49.99"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={String(draft.price ?? 0)}
                  onChangeText={(t) => setDraft((p) => ({ ...p, price: Number(t.replace(',', '.')) || 0 }))}
                />

                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={String(draft.quantity ?? 0)}
                  onChangeText={(t) => {
                    const n = parseInt(t, 10);
                    setDraft((p) => ({ ...p, quantity: Number.isFinite(n) ? n : 0 }));
                  }}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Short description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={draft.description}
                  onChangeText={(t) => setDraft((p) => ({ ...p, description: t }))}
                />

                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={saveDraft}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: colors.buttonText, fontWeight: '700' }}>
                      {editingId === null ? 'Add' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeEditor}
                    style={{
                      flex: 1,
                      backgroundColor: colors.cardBackground,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Saving overlay */}
      {saving && (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: '#fff', fontWeight: '700', textAlign: 'center' }}>
            Saving catalog… Please stay on this screen
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default CatalogEditorScreen;
