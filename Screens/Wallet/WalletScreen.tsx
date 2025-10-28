import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';

import { useTheme } from '../context/ThemeContext';
import { auth } from '../../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import createStyles from '../context/appStyles';
import { Ionicons } from '@expo/vector-icons';

type Tx = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  note?: string;
  createdAt: number; // ms
};

const functions = getFunctions(getApp(), 'us-central1');

/* -------------------- helpers to normalize backend shapes -------------------- */
function tsToMs(t: any): number {
  if (!t) return Date.now();
  if (typeof t === 'number') return t < 1e12 ? t * 1000 : t; // seconds → ms
  if (typeof t === 'string') {
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? ms : Date.now();
  }
  if (typeof t?.toMillis === 'function') return t.toMillis();
  if (typeof t?.seconds === 'number') {
    return t.seconds * 1000 + Math.floor((t.nanoseconds || 0) / 1e6);
  }
  return Date.now();
}

function toNumberAmount(x: any): number {
  if (x == null) return 0;
  if (typeof x === 'number') return x;
  if (typeof x === 'string') {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof x === 'object') {
    if (typeof x.value === 'number') return x.value;
    if (typeof x.amount === 'number') return x.amount;
    if (typeof x.cents === 'number') return x.cents / 100;
    if (typeof x.minor === 'number') return x.minor / 100;
  }
  return 0;
}

function pickCurrency(x: any, fallback: string): string {
  const c = x?.currency ?? x?.ccy ?? x ?? fallback ?? 'ZAR';
  return String(c).toUpperCase();
}

function pickType(x: any): 'credit' | 'debit' {
  const s = String(x || '').toLowerCase();
  return ['debit', 'sent', 'out', 'payment', 'withdrawal'].includes(s) ? 'debit' : 'credit';
}

function formatMoneySafe(v: any, ccy: string) {
  const n = toNumberAmount(v);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(n);
  } catch {
    return `${ccy} ${n.toFixed(2)}`;
  }
}

function formatDay(ts: number) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  // e.g. "Sep 5, 2025"
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}


/* -------------------------------- component -------------------------------- */
export default function WalletScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors).WalletScreen, [colors]);

  const [balance, setBalance] = useState<number>(0);
  const [baseCurrency, setBaseCurrency] = useState<string>('ZAR');
  const [amount, setAmount] = useState<string>('50');
  const [loading, setLoading] = useState<boolean>(false);

  const [tx, setTx] = useState<Tx[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Receive (show my QR)
  const [qrVisible, setQrVisible] = useState<boolean>(false);

  // Scan → Send
  const [scanVisible, setScanVisible] = useState<boolean>(false);
  const [sendVisible, setSendVisible] = useState<boolean>(false);
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [scanningLocked, setScanningLocked] = useState<boolean>(false);

  const [scannedUid, setScannedUid] = useState<string>('');
  const [scannedCurrency, setScannedCurrency] = useState<string>('ZAR');
  const [scannedAmount, setScannedAmount] = useState<string>(''); // sender enters this

  const uid = auth.currentUser?.uid || '';

  const createOrder = httpsCallable(functions, 'createPayPalOrder');
  const captureOrder = httpsCallable(functions, 'capturePayPalOrder');
  const getBalanceFn = httpsCallable(functions, 'getWalletBalance');
  const getTxFn = httpsCallable(functions, 'getTransactions');
  const transferFn = httpsCallable(functions, 'transferFunds');

  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      const [bRes, tRes] = await Promise.all([getBalanceFn({}), getTxFn({ limit: 20 })]);
      const b = (bRes.data as any) || {};
      const t = (tRes.data as any) || {};

      setBalance(toNumberAmount(b.balance || 0));
      const walletCcy = pickCurrency(b.currency, 'ZAR');
      setBaseCurrency(walletCcy);

      const cleaned: Tx[] = (t.items || []).map((raw: any) => ({
        id: String(raw.id || raw.txId || raw.docId || raw.refId || Math.random()),
        type: pickType(raw.type),
        amount: toNumberAmount(raw.amount ?? raw.total ?? raw.value ?? raw.amount_cents),
        currency: pickCurrency(raw.currency ?? raw.amount?.currency ?? raw.ccy, walletCcy),
        note: raw.note || raw.description || '',
        createdAt: tsToMs(raw.createdAt ?? raw.created_at ?? raw.created ?? raw.ts ?? raw.time),
      }));
      setTx(cleaned);
      setHasMore(!!t.hasMore);
      setNextCursor(t.nextCursor || null);
    } catch (e: any) {
      console.log('wallet refresh err:', e?.message || e);
    }
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function buildQrPayload(): string {
    // Keep it STABLE: just encode wallet identity (no amount, no timestamp)
    // Support both JSON and deep link (some scanners show raw text)
    // We'll use JSON: {"type":"wallet","uid":"...","currency":"ZAR"}
    return JSON.stringify({ type: 'wallet', uid, currency: baseCurrency });
  }

  /* ------------------------------ PayPal top-up ------------------------------ */
  async function onTopUp() {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Invalid amount', 'Enter a valid number');
      return;
    }
    setLoading(true);
    try {
      const returnUrl = Linking.createURL('paypal-return');
      const cancelUrl = `${returnUrl}?cancel=true`;

      const c = await createOrder({
        amount: Number(amount).toFixed(2),
        currency: baseCurrency,
        returnUrl,
        cancelUrl,
      });
      const d = (c.data || {}) as any;
      const approval =
        d?.approveLinks?.find((l: any) => l.rel === 'approve')?.href ||
        d?.links?.find((l: any) => l.rel === 'approve')?.href;

      if (!approval) throw new Error('Missing PayPal approval URL');

      const res = await (await import('expo-web-browser')).openAuthSessionAsync(approval, returnUrl);
      if (res.type !== 'success') {
        if (res.type === 'cancel' || res.type === 'dismiss') return;
        throw new Error(`Browser: ${res.type}`);
      }

      const parsed = Linking.parse(res.url) as any;
      const token = parsed?.queryParams?.token || d?.orderId || parsed?.queryParams?.orderId;
      if (!token) throw new Error('No orderId from redirect');

      const cap = await captureOrder({ orderId: token });
      const capData = (cap.data || {}) as any;
      if (capData.status !== 'SUCCESS') {
        throw new Error(`Capture failed: ${capData.status || 'UNKNOWN'}`);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
      Alert.alert(
        'Top-up complete',
        `Credited ${formatMoneySafe(capData.credited || Number(amount), baseCurrency)}`
      );
    } catch (e: any) {
      console.log('Top-up error:', e?.message || e);
      Alert.alert('Top-Up Failed', e?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------- History paging ----------------------------- */
  async function loadMore() {
    if (!hasMore || !nextCursor) return;
    try {
      const r = await getTxFn({ limit: 20, cursor: nextCursor });
      const d = (r.data || {}) as any;
      const more: Tx[] = (d.items || []).map((raw: any) => ({
        id: String(raw.id || raw.txId || raw.docId || raw.refId || Math.random()),
        type: pickType(raw.type),
        amount: toNumberAmount(raw.amount ?? raw.total ?? raw.value ?? raw.amount_cents),
        currency: pickCurrency(raw.currency ?? raw.amount?.currency ?? raw.ccy, baseCurrency),
        note: raw.note || raw.description || '',
        createdAt: tsToMs(raw.createdAt ?? raw.created_at ?? raw.created ?? raw.ts ?? raw.time),
      }));
      setTx(prev => [...prev, ...more]);
      setHasMore(!!d.hasMore);
      setNextCursor(d.nextCursor || null);
    } catch (e) {
      console.log('loadMore err:', e);
    }
  }

  /* ------------------------------ Scan → Send ------------------------------ */
  function parseScannedData(data: string) {
    // JSON {"type":"wallet","uid":"...","currency":"ZAR"}
    try {
      const obj = JSON.parse(data);
      if (obj && obj.uid) {
        return {
          uid: String(obj.uid),
          currency: pickCurrency(obj.currency, baseCurrency),
        };
      }
    } catch {}
    // Deep link: dsquare://pay?to=UID
    try {
      const parsed = Linking.parse(data) as any;
      const to = parsed?.queryParams?.to || parsed?.queryParams?.uid;
      if (to) {
        return { uid: String(to), currency: baseCurrency.toUpperCase() };
      }
    } catch {}
    // Fallback: whole string is UID
    return { uid: data, currency: baseCurrency.toUpperCase() };
  }

  const handleScanned = useCallback(
    (scan: any) => {
      if (scanningLocked) return;
      setScanningLocked(true);
      try {
        const code = Array.isArray(scan?.barcodes) ? scan.barcodes[0]?.data : scan?.data;
        if (!code) return;

        const parsed = parseScannedData(String(code));
        setScannedUid(parsed.uid);
        setScannedCurrency(parsed.currency);
        setScannedAmount(''); // sender decides amount
        setScanVisible(false);
        setTimeout(() => setSendVisible(true), 250);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } finally {
        setTimeout(() => setScanningLocked(false), 800);
      }
    },
    [scanningLocked, baseCurrency]
  );

  async function openScanner() {
    if (!cameraPerm?.granted) {
      const res = await requestCameraPerm();
      if (!res.granted) {
        Alert.alert('Camera needed', 'Enable camera access to scan QR codes.');
        return;
      }
    }
    setScanVisible(true);
  }

  async function onSendConfirm() {
    if (!scannedUid) {
      Alert.alert('No receiver', 'Scan a valid wallet QR code.');
      return;
    }
    if (!scannedAmount || isNaN(Number(scannedAmount))) {
      Alert.alert('Amount required', 'Enter a valid amount to send.');
      return;
    }
    setLoading(true);
    try {
      const r = await transferFn({
        toUid: scannedUid,
        amount: Number(scannedAmount).toFixed(2),
        currency: scannedCurrency || baseCurrency,
        note: 'QR payment',
      });
      const d = (r.data || {}) as any;
      if (d?.status !== 'SUCCESS') throw new Error(d?.message || 'Transfer failed');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSendVisible(false);
      setScannedAmount('');
      await refresh();
      Alert.alert('Sent', `You sent ${formatMoneySafe(d.debited || scannedAmount, baseCurrency)}.`);
    } catch (e: any) {
      console.log('send err:', e?.message || e);
      Alert.alert('Send failed', e?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------- render -------------------------------- */
  const renderTx = ({ item }: { item: Tx }) => {
    const sign = item.type === 'debit' ? '-' : '+';
    const color = item.type === 'debit' ? styles.txAmountNegative : styles.txAmountPositive;
    return (
      <View style={styles.txItem}>
        <View style={styles.txIconWrap}>
          <Ionicons
            name={item.type === 'debit' ? 'trending-down' : 'trending-up'}
            size={18}
            color={colors.textPrimary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txTitle}>{item.type === 'debit' ? 'Sent' : 'Received'}</Text>
          {!!item.note && <Text style={styles.txMeta}>{item.note}</Text>}
          <Text style={styles.txMeta}>{formatDay(item.createdAt)}</Text>
        </View>
        <Text style={[styles.txAmount, color]}>
          {sign}
          {formatMoneySafe(item.amount, item.currency)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Wallet</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setQrVisible(true)} style={styles.iconBtn}>
            <Ionicons name="qr-code" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Available balance</Text>
        </View>
        <Text style={styles.balanceValue}>{formatMoneySafe(balance, baseCurrency)}</Text>
        <Text style={styles.balanceSub}>{baseCurrency} Wallet • Secure payments</Text>
        <View style={styles.idRow}>
          <View style={styles.idPill}>
            <Text style={styles.idPillText} numberOfLines={1}>
              {uid}
            </Text>
          </View>
        </View>
      </View>

      {/* Top up */}
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={80}
      >
        <View style={styles.topUpRow}>
          <TextInput
            style={styles.amountField}
            placeholder="Amount e.g. 50"
            placeholderTextColor={colors.placeholderText}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TouchableOpacity onPress={onTopUp} disabled={loading} style={styles.topUpBtn}>
            <Ionicons name="card" size={18} color="#fff" />
            <Text style={styles.topUpBtnText}>{loading ? 'Processing…' : 'Top Up'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* History */}
      <Text style={styles.sectionTitle}>Recent activity</Text>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={tx}
        keyExtractor={(i) => i.id}
        renderItem={renderTx}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet</Text>}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Scan FAB */}
      <TouchableOpacity style={styles.fab} onPress={openScanner} activeOpacity={0.8}>
        <Ionicons name="scan" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Receive (show my QR) */}
      <Modal visible={qrVisible} transparent animationType="slide">
        <Pressable style={styles.qrBackdrop} onPress={() => setQrVisible(false)}>
          <Pressable style={styles.qrSheet} onPress={() => {}}>
            <Text style={styles.qrTitle}>Receive money</Text>
            <Text style={styles.qrSubtitle}>Let the sender scan this code to pay you.</Text>

            <View style={styles.qrBlock}>
              <QRCode value={buildQrPayload()} size={180} />
            </View>

            <View style={styles.qrActions}>
              <TouchableOpacity
                style={styles.qrShareBtn}
                onPress={async () => {
                  const payload = buildQrPayload();
                  await Share.share({
                    message: payload,
                    title: 'My Dsquare wallet QR',
                  });
                }}
              >
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.qrShareText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setQrVisible(false)}>
                <Text style={styles.qrCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Scanner */}
      <Modal visible={scanVisible} transparent animationType="fade">
        <View style={styles.scannerModal}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScanned}
          />
          <View style={styles.scanOverlay}>
            <Text style={styles.scanHint}>Align the QR within the frame</Text>
            <TouchableOpacity onPress={() => setScanVisible(false)} style={styles.qrCloseBtn}>
              <Text style={styles.qrCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Send confirm (sender enters amount) */}
      <Modal visible={sendVisible} transparent animationType="slide">
        <Pressable style={styles.qrBackdrop} onPress={() => setSendVisible(false)}>
          <Pressable style={styles.sendModalCard} onPress={() => {}}>
            <Text style={styles.qrTitle}>Send money</Text>
            <Text style={styles.qrSubtitle}>To: {scannedUid}</Text>

            <View style={styles.amountRow}>
              <Text style={styles.currencyPrefix}>{scannedCurrency}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Amount"
                placeholderTextColor={colors.placeholderText}
                keyboardType="decimal-pad"
                value={scannedAmount}
                onChangeText={setScannedAmount}
              />
            </View>

            <View style={styles.sendActions}>
              <TouchableOpacity onPress={() => setSendVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSendConfirm} style={styles.sendBtn} disabled={loading}>
                <Text style={styles.sendBtnText}>{loading ? 'Sending…' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
