// Screens/Businesses/ShopScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import {
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { db, storage, auth } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import createStyles, { FONT_SIZES } from '../context/appStyles';
import { RootStackParamList, CatalogItem } from '../../types';

type NavProp = StackNavigationProp<RootStackParamList, 'ShopScreen'>;
type RoutePropType = RouteProp<RootStackParamList, 'ShopScreen'>;

type Product = {
  id?: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string; // can be https://... or storage object path like business_catalog/...
  quantity?: number;
  category?: string;
};

type CartItem = {
  id: string;           // unique line id
  productId?: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  notes?: string;
};

// Convert a stored Storage path (business_catalog/uid/bizId/file.jpg) → public URL
const resolveImageUrl = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const bucket = (storage as any)?.app?.options?.storageBucket as string | undefined;
  if (bucket) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(raw)}?alt=media`;
  }
  return undefined;
};

const ShopScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { colors } = useTheme();
  const stylesFromTheme = createStyles(colors).createBusinessScreen;

  const {
    businessId,
    businessName: headerBusinessName,
    catalog: paramCatalog,
  } = (route.params ?? {}) as Partial<{
    businessId: string;
    businessName: string;
    catalog: CatalogItem[];
  }>;

  const [loading, setLoading] = useState<boolean>(!!businessId && !paramCatalog);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState<string>(headerBusinessName ?? 'Shop');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(
    (paramCatalog ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      price: typeof c.price === 'number' ? c.price : Number(c.price || 0),
      description: c.description,
      imageUrl: c.imageUrl,
      quantity: (c as any).quantity ?? 0,
      category: (c as any).category ?? 'Uncategorized',
    }))
  );

  // cart (local)
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.price, 0), [cart]);

  // Product detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNotes, setDetailNotes] = useState('');

  // Cart modal
  const [cartVisible, setCartVisible] = useState(false);

  // Checkout modal
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Wallet states
  const [walletLoading, setWalletLoading] = useState(false);
  const [buyerBalance, setBuyerBalance] = useState<number | null>(null);

  // Live-listen to business for catalog + ownerId
  useEffect(() => {
    if (!businessId || paramCatalog) return;
    const ref = doc(db, 'businesses', businessId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (data) {
          setBusinessName(data.name || 'Shop');
          setOwnerId(data.ownerId || null);
          const cat: Product[] = (data.catalog ?? []).map((c: CatalogItem) => ({
            id: c.id,
            name: c.name,
            price: typeof c.price === 'number' ? c.price : Number(c.price || 0),
            description: c.description,
            imageUrl: c.imageUrl,
            quantity: (c as any).quantity ?? 0,
            category: (c as any).category ?? 'Uncategorized',
          }));
          setProducts(cat);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Failed to load products.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [businessId, paramCatalog]);

  // Search & categories
  const [query, setQuery] = useState('');
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add((p.category ?? 'Uncategorized').trim() || 'Uncategorized'));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = selectedCategory === 'All' || (p.category ?? 'Uncategorized') === selectedCategory;
      const qOk =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [products, query, selectedCategory]);

  // Product details
  const openDetails = (p: Product) => {
    setDetailProduct(p);
    setDetailQty(1);
    setDetailNotes('');
    setDetailVisible(true);
  };
  const closeDetails = () => setDetailVisible(false);

  const addToCart = () => {
    if (!detailProduct) return;
    const stock = typeof detailProduct.quantity === 'number' ? detailProduct.quantity : undefined;
    const qty = Math.max(1, detailQty);
    if (typeof stock === 'number' && stock >= 0 && qty > stock) return;

    const lineId = `${detailProduct.id || detailProduct.name}-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        id: lineId,
        productId: detailProduct.id,
        name: detailProduct.name,
        price: Number(detailProduct.price) || 0,
        imageUrl: detailProduct.imageUrl,
        quantity: qty,
        notes: detailNotes.trim() || undefined,
      },
    ]);
    setDetailVisible(false);
  };

  // Cart ops
  const openCart = () => setCartVisible(true);
  const closeCart = () => setCartVisible(false);

  const incLine = (lineId: string) => {
    setCart((prev) =>
      prev.map((it) => {
        if (it.id !== lineId) return it;
        const product = products.find((p) => p.id === it.productId);
        const stock = typeof product?.quantity === 'number' ? product.quantity : undefined;
        const nextQty = it.quantity + 1;
        if (typeof stock === 'number' && stock >= 0 && nextQty > stock) return it;
        return { ...it, quantity: nextQty };
      })
    );
  };

  const decLine = (lineId: string) => {
    setCart((prev) =>
      prev
        .map((it) => (it.id === lineId ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== lineId));
  };

  // Location (fills address)
  const useMyLocation = async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to auto-fill your address.');
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const line = [
        place?.name,
        place?.street,
        place?.city,
        place?.region,
        place?.postalCode,
        place?.country,
      ]
        .filter(Boolean)
        .join(', ');
      setAddress(line);
    } catch (e: any) {
      console.error('Location error', e);
      Alert.alert('Error', e?.message || 'Could not get your location.');
    } finally {
      setLocLoading(false);
    }
  };

  // Fetch buyer wallet balance (self-read allowed by your rules)
  const fetchBuyerBalance = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setBuyerBalance(null);
      return;
    }
    try {
      setWalletLoading(true);
      const wSnap = await getDoc(doc(db, 'wallets', uid));
      if (wSnap.exists()) {
        const bal = Number((wSnap.data() as any).balance ?? 0);
        setBuyerBalance(Number.isFinite(bal) ? bal : 0);
      } else {
        setBuyerBalance(0);
      }
    } catch (e) {
      console.error('Wallet read failed', e);
      setBuyerBalance(null);
    } finally {
      setWalletLoading(false);
    }
  };

  // Proceed to checkout
  const openCheckout = async () => {
    setCartVisible(false);
    await fetchBuyerBalance();
    setCheckoutVisible(true);
  };
  const closeCheckout = () => setCheckoutVisible(false);

  // ✅ Place order via Cloud Function (atomic debit/credit + create order)
  const placeOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Add items before checking out.');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Sign in required', 'Please sign in to place an order.');
      return;
    }
    if (!businessId) {
      Alert.alert('Missing info', 'Business information is incomplete.');
      return;
    }

    // Balance check (client-side UX only)
    if (typeof buyerBalance === 'number' && buyerBalance < cartTotal) {
      Alert.alert(
        'Insufficient funds',
        `Your wallet balance is R${buyerBalance.toFixed(2)} but total is R${cartTotal.toFixed(2)}.`
      );
      return;
    }

    setPlacing(true);
    try {
      const items = cart.map((i) => ({
        productId: i.productId || null,
        name: i.name,
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 0,
        notes: i.notes || null,
        imageUrl: i.imageUrl || null,
      }));

      const functions = getFunctions();
      const payAndPlaceOrder = httpsCallable(functions, 'payAndPlaceOrder');

      const res: any = await payAndPlaceOrder({
        businessId,
        items,
        address: address || null,
        total: Number(cartTotal.toFixed(2)),
      });

      // success
      setCart([]);
      setCheckoutVisible(false);
      Alert.alert('Order paid', 'Your order has been placed and paid.', [
        { text: 'OK', onPress: () => {} },
      ]);
    } catch (e: any) {
      console.error('payAndPlaceOrder failed', e);
      const msg =
        e?.message?.includes('functions') && e?.message?.includes('response') && e?.message
          ? 'Payment failed. Please try again.'
          : e?.message || 'Payment failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setPlacing(false);
    }
  };

  // UI bits
  const renderCategory = (cat: string) => {
    const active = selectedCategory === cat;
    return (
      <TouchableOpacity
        key={cat}
        onPress={() => setSelectedCategory(cat)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginRight: 10,
          borderRadius: 16,
          backgroundColor: active ? colors.primary : colors.cardBackground,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.borderColor,
        }}
      >
        <Text style={{ color: active ? colors.buttonText : colors.textPrimary, fontWeight: '600' }}>
          {cat}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const img = resolveImageUrl(item.imageUrl);
    return (
      <TouchableOpacity
        onPress={() => openDetails(item)}
        activeOpacity={0.9}
        style={{
          flex: 1,
          backgroundColor: colors.cardBackground,
          borderRadius: 14,
          padding: 10,
          margin: 6,
        }}
      >
        {img ? (
          <Image
            source={{ uri: img }}
            style={{ width: '100%', height: 120, borderRadius: 10, marginBottom: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 120,
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
          {typeof item.quantity === 'number' && (
            <Text style={{ color: item.quantity > 0 ? colors.secondaryText : '#d9534f', fontSize: 12 }}>
              {item.quantity > 0 ? `Stock: ${item.quantity}` : 'Out'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCartLine = ({ item }: { item: CartItem }) => {
    const img = resolveImageUrl(item.imageUrl);
    const product = products.find((p) => p.id === item.productId);
    const stock = typeof product?.quantity === 'number' ? product.quantity : undefined;
    const plusDisabled = typeof stock === 'number' && stock >= 0 && item.quantity >= stock;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
        }}
      >
        {img ? (
          <Image source={{ uri: img }} style={{ width: 56, height: 56, borderRadius: 8, marginRight: 10 }} />
        ) : (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              marginRight: 10,
              backgroundColor: '#00000012',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="image-outline" size={20} color={colors.secondaryText} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {item.name}
          </Text>
          <Text style={{ color: colors.secondaryText }}>R{item.price.toFixed(2)}</Text>
          {item.notes && (
            <Text numberOfLines={1} style={{ color: colors.secondaryText, fontSize: 12 }}>
              {item.notes}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity
            onPress={() => decLine(item.id)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
            }}
          >
            <Ionicons name="remove" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ width: 34, textAlign: 'center', color: colors.textPrimary, fontWeight: '700' }}>
            {item.quantity}
          </Text>
          <TouchableOpacity
            onPress={() => incLine(item.id)}
            disabled={plusDisabled}
            style={[
              {
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.borderColor,
              },
              plusDisabled && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="add" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => removeLine(item.id)} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={20} color={colors.error || '#d9534f'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: FONT_SIZES.large,
            fontWeight: '700',
            color: colors.textPrimary,
            marginRight: 30,
          }}
          numberOfLines={1}
        >
          {businessName || 'Shop'}
        </Text>
        <TouchableOpacity onPress={openCart} style={{ padding: 6 }}>
          <Ionicons name="cart-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderColor,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="search" size={18} color={colors.secondaryText} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: colors.textPrimary, paddingVertical: 2 }}
            placeholder="Search products..."
            placeholderTextColor={colors.placeholderText as string}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories (horizontal) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {allCategories.map(renderCategory)}
          </View>
        </ScrollView>
      </View>

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 8, color: colors.secondaryText }}>Loading products…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="alert-circle" size={28} color={colors.error || '#d9534f'} />
          <Text style={{ marginTop: 8, color: colors.secondaryText, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) => item.id ?? String(index)}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 10 }}
          contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.secondaryText, marginTop: 12 }}>
              No products found.
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating cart FAB with badge */}
      <TouchableOpacity
        onPress={openCart}
        activeOpacity={0.9}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <Ionicons name="cart-outline" size={26} color={colors.buttonText} />
        {cartCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: '#ff4d4f',
              borderRadius: 10,
              minWidth: 18,
              paddingHorizontal: 4,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Product details modal */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={closeDetails}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                padding: 16,
                maxHeight: '92%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                  {detailProduct?.name}
                </Text>
                <TouchableOpacity onPress={closeDetails} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              {resolveImageUrl(detailProduct?.imageUrl) ? (
                <Image
                  source={{ uri: resolveImageUrl(detailProduct?.imageUrl)! }}
                  style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 12,
                    marginBottom: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#00000012',
                  }}
                >
                  <Ionicons name="image-outline" size={36} color={colors.secondaryText} />
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>
                  R{Number(detailProduct?.price ?? 0).toFixed(2)}
                </Text>
                {typeof detailProduct?.quantity === 'number' && (
                  <Text style={{ color: (detailProduct!.quantity! > 0) ? colors.secondaryText : '#d9534f' }}>
                    {detailProduct!.quantity! > 0 ? `Stock: ${detailProduct!.quantity}` : 'Out of stock'}
                  </Text>
                )}
              </View>

              {!!detailProduct?.category && (
                <Text style={{ color: colors.secondaryText, marginBottom: 8 }}>
                  Category: {detailProduct?.category}
                </Text>
              )}

              {!!detailProduct?.description && (
                <Text style={{ color: colors.textPrimary, marginBottom: 12 }}>
                  {detailProduct?.description}
                </Text>
              )}

              {/* Quantity stepper */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', marginRight: 10 }}>Qty</Text>
                <TouchableOpacity
                  onPress={() => setDetailQty((q) => Math.max(1, q - 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                  }}
                >
                  <Ionicons name="remove" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={{ width: 40, textAlign: 'center', color: colors.textPrimary, fontWeight: '700' }}>
                  {detailQty}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const stock = typeof detailProduct?.quantity === 'number' ? detailProduct!.quantity! : undefined;
                    setDetailQty((q) => (typeof stock === 'number' && stock >= 0 ? Math.min(stock, q + 1) : q + 1));
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                  }}
                >
                  <Ionicons name="add" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Custom specs / notes */}
              <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 6 }}>Custom specs / notes</Text>
              <TextInput
                style={{
                  minHeight: 70,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  backgroundColor: colors.cardBackground,
                  color: colors.textPrimary,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  textAlignVertical: 'top',
                }}
                placeholder="e.g., extra spicy, no onions, size L"
                placeholderTextColor={colors.placeholderText as string}
                multiline
                value={detailNotes}
                onChangeText={setDetailNotes}
              />

              <TouchableOpacity
                onPress={addToCart}
                disabled={typeof detailProduct?.quantity === 'number' && detailProduct.quantity <= 0}
                style={[
                  stylesFromTheme.submitButton,
                  { marginTop: 14 },
                  (typeof detailProduct?.quantity === 'number' && detailProduct.quantity <= 0) && { opacity: 0.5 },
                ]}
              >
                <Text style={stylesFromTheme.submitButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Cart modal */}
      <Modal visible={cartVisible} transparent animationType="slide" onRequestClose={closeCart}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                padding: 16,
                maxHeight: '92%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                  Your Cart ({cartCount})
                </Text>
                <TouchableOpacity onPress={closeCart} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              {cart.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                  <Ionicons name="cart-outline" size={36} color={colors.secondaryText} />
                  <Text style={{ marginTop: 8, color: colors.secondaryText }}>Your cart is empty.</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={cart}
                    keyExtractor={(it) => it.id}
                    renderItem={renderCartLine}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                  />

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.borderColor,
                    }}
                  >
                    <Text style={{ color: colors.secondaryText, fontWeight: '600' }}>Subtotal</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>
                      R{cartTotal.toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={openCheckout}
                    style={[stylesFromTheme.submitButton, { marginTop: 12 }]}
                  >
                    <Text style={stylesFromTheme.submitButtonText}>Proceed to Checkout</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Checkout modal */}
      <Modal visible={checkoutVisible} transparent animationType="slide" onRequestClose={closeCheckout}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                padding: 16,
                maxHeight: '92%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                  Checkout
                </Text>
                <TouchableOpacity onPress={closeCheckout} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* Business wallet summary */}
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.secondaryText, marginBottom: 4 }}>Paying to</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {businessName}
                </Text>
                <Text style={{ color: colors.secondaryText, fontSize: 12, marginTop: 2 }}>
                  Wallet: wallets/{ownerId || 'unknown'}
                </Text>
              </View>

              {/* Wallet balance */}
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.secondaryText, marginBottom: 4 }}>Your wallet</Text>
                {walletLoading ? (
                  <Text style={{ color: colors.secondaryText }}>Loading balance…</Text>
                ) : (
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    Balance: R{Number(buyerBalance ?? 0).toFixed(2)}
                  </Text>
                )}
              </View>

              {/* Address section */}
              <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 6 }}>Delivery location</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={useMyLocation}
                  disabled={locLoading}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    marginRight: 10,
                    opacity: locLoading ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: '700' }}>
                    {locLoading ? 'Locating…' : 'Use my location'}
                  </Text>
                </TouchableOpacity>

                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                  or edit below
                </Text>
              </View>

              <TextInput
                style={{
                  minHeight: 50,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  backgroundColor: colors.cardBackground,
                  color: colors.textPrimary,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
                placeholder="Street, suburb, city, postal code"
                placeholderTextColor={colors.placeholderText as string}
                value={address}
                onChangeText={setAddress}
              />

              {/* Order summary */}
              <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: colors.borderColor, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: colors.secondaryText }}>Items</Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{cartCount}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.secondaryText }}>Total</Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>
                    R{cartTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={placeOrder}
                disabled={placing}
                style={[
                  stylesFromTheme.submitButton,
                  { marginTop: 14 },
                  placing && { opacity: 0.6 },
                ]}
              >
                <Text style={stylesFromTheme.submitButtonText}>
                  {placing ? 'Placing…' : 'Confirm Order & Pay'}
                </Text>
              </TouchableOpacity>

              {typeof buyerBalance === 'number' && buyerBalance < cartTotal && (
                <Text style={{ color: '#d9534f', marginTop: 8, textAlign: 'center' }}>
                  Not enough balance. Add funds in your wallet.
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ShopScreen;
