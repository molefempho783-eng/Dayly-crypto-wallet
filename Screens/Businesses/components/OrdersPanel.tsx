// Screens/Businesses/components/OrdersPanel.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  DocumentData,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

import { db, storage, auth } from '../../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

type Order = {
  id: string;
  businessId: string;
  ownerId: string;
  userId: string;
  items: Array<{ name: string; imageUrl?: string; quantity: number; price: number; notes?: string | null }>;
  total: number;
  status: 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled' | string;
  deliveryAddress?: string | null;
  createdAt?: Timestamp;
};

const STATUSES: Array<{ key: string; label: string }> = [
  { key: 'all',        label: 'All' },
  { key: 'paid',       label: 'Paid' },
  { key: 'preparing',  label: 'Preparing' },
  { key: 'ready',      label: 'Ready' },
  { key: 'completed',  label: 'Completed' },
  { key: 'cancelled',  label: 'Cancelled' },
];

const resolveImageUrl = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const bucket = (storage as any)?.app?.options?.storageBucket as string | undefined;
  if (bucket) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(raw)}?alt=media`;
  }
  return undefined;
};

const nextStatuses = (current: string): Array<'preparing' | 'ready' | 'completed'> => {
  switch (current) {
    case 'paid':       return ['preparing', 'ready', 'completed'];
    case 'preparing':  return ['ready', 'completed'];
    case 'ready':      return ['completed'];
    default:           return [];
  }
};

export default function OrdersPanel({ businessId }: { businessId?: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // cache minimal buyer info
  const [buyers, setBuyers] = useState<Record<string, { name?: string; email?: string; phone?: string; photoURL?: string }>>({});

  const loadBuyer = useCallback(async (userId: string) => {
    if (!userId || buyers[userId]) return;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        const d: any = snap.data();
        setBuyers(prev => ({
          ...prev,
          [userId]: {
            name: d.displayName || d.name || 'Customer',
            email: d.email || '',
            phone: d.phoneNumber || d.phone || '',
            photoURL: d.photoURL || '',
          },
        }));
      } else {
        setBuyers(prev => ({ ...prev, [userId]: { name: 'Customer' } }));
      }
    } catch {
      setBuyers(prev => ({ ...prev, [userId]: { name: 'Customer' } }));
    }
  }, [buyers]);

  useEffect(() => {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId) return;

    const base = [where('ownerId', '==', ownerId)] as any[];
    if (businessId) base.push(where('businessId', '==', businessId));

    const q = query(collection(db, 'orders'), ...base, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Order[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Order[];
        setOrders(list);
        setLoading(false);
        // prefetch a few buyers
        list.slice(0, 10).forEach(o => loadBuyer(o.userId));
      },
      (err) => {
        console.error('Orders listener failed', err);
        setOrders([]);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId, loadBuyer]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of STATUSES) if (s.key !== 'all') c[s.key] = 0;
    orders.forEach((o) => {
      const k = String(o.status || '').toLowerCase();
      if (!(k in c)) c[k] = 0;
      c[k] += 1;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => String(o.status).toLowerCase() === filter);
  }, [orders, filter]);

  const updateStatus = async (order: Order, status: 'preparing' | 'ready' | 'completed') => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error('Update status failed', e);
      Alert.alert('Update failed', e?.message || 'Could not update status.');
    }
  };

  const renderChip = (s: { key: string; label: string }) => {
    const active = filter === s.key;
    return (
      <TouchableOpacity
        key={s.key}
        onPress={() => setFilter(s.key)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
          marginRight: 8,
          backgroundColor: active ? colors.primary : colors.cardBackground,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.borderColor,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: active ? colors.buttonText : colors.textPrimary, fontWeight: '700' }}>
          {s.label}
        </Text>
        <Text
          style={{
            marginLeft: 6,
            color: active ? colors.buttonText : colors.secondaryText,
            fontWeight: '700',
          }}
        >
          {(counts[s.key] ?? 0).toString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const firstImg = resolveImageUrl(item.items?.[0]?.imageUrl);
    const when = item.createdAt?.toDate?.() ? item.createdAt.toDate() : undefined;
    const subtitle = when ? when.toLocaleString() : '';
    const itemsLabel = item.items?.length ? `${item.items.length} item${item.items.length > 1 ? 's' : ''}` : 'No items';
    const expanded = expandedId === item.id;
    const allowed = nextStatuses(String(item.status).toLowerCase());

    return (
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
          paddingVertical: 10,
        }}
      >
        {/* Row header (kept same styling) */}
        <TouchableOpacity
          onPress={() => {
            const next = expanded ? null : item.id;
            setExpandedId(next);
            if (next) loadBuyer(item.userId);
          }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          activeOpacity={0.8}
        >
          {firstImg ? (
            <Image
              source={{ uri: firstImg }}
              style={{ width: 54, height: 54, borderRadius: 10, marginRight: 12 }}
            />
          ) : (
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 10,
                marginRight: 12,
                backgroundColor: '#00000012',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="receipt-outline" size={22} color={colors.secondaryText} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '800' }}>
              R{Number(item.total || 0).toFixed(2)} • {String(item.status).toUpperCase()}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.secondaryText }}>
              {itemsLabel} {subtitle ? `• ${subtitle}` : ''}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.secondaryText, fontSize: 12 }}>
              #{item.id}
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={colors.secondaryText}
          />
        </TouchableOpacity>

        {/* Expanded dropdown (minimal, matches palette) */}
        {expanded && (
          <View style={{ marginTop: 10, paddingLeft: 66 }}>
            {/* Buyer details */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 4 }}>
                Customer
              </Text>
              <Text style={{ color: colors.secondaryText }}>
                {buyers[item.userId]?.name || 'Customer'}
              </Text>
              {!!buyers[item.userId]?.email && (
                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                  {buyers[item.userId]?.email}
                </Text>
              )}
              {!!buyers[item.userId]?.phone && (
                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                  {buyers[item.userId]?.phone}
                </Text>
              )}
              {!!item.deliveryAddress && (
                <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                  📍 {item.deliveryAddress}
                </Text>
              )}
            </View>

            {/* Items list (compact) */}
            {item.items?.map((it, idx) => {
              const u = resolveImageUrl(it.imageUrl);
              return (
                <View key={`${it.name}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {u ? (
                    <Image source={{ uri: u }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 8 }} />
                  ) : (
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 8, marginRight: 8,
                        backgroundColor: '#00000012', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="image-outline" size={18} color={colors.secondaryText} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700' }}>
                      {it.name} × {it.quantity}
                    </Text>
                    {!!it.notes && (
                      <Text numberOfLines={1} style={{ color: colors.secondaryText, fontSize: 12 }}>
                        {it.notes}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: colors.textPrimary }}>
                    R{(Number(it.price) * Number(it.quantity)).toFixed(2)}
                  </Text>
                </View>
              );
            })}

            {/* Actions: status + chat */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              {allowed.map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => updateStatus(item, st)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    marginRight: 8,
                    marginTop: 6,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    Mark {st}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => navigation.navigate('ChatRoomScreen', { userId: item.userId, from: 'orders' })}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  marginTop: 6,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: colors.buttonText, fontWeight: '700' }}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderColor,
        padding: 12,
      }}
    >
      <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
        Orders
      </Text>

      {/* Status chips (unchanged) */}
      <View style={{ flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' }}>
        {STATUSES.map((s) => renderChip(s))}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ marginTop: 6, color: colors.secondaryText }}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={{ color: colors.secondaryText, textAlign: 'center', paddingVertical: 12 }}>
              No orders {filter !== 'all' ? `in "${filter}"` : ''} yet.
            </Text>
          }
        />
      )}
    </View>
  );
}
