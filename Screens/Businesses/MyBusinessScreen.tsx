import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  SafeAreaView,
  Modal,
  TextInput,
  Switch,
  Pressable,
} from "react-native";
import {
  useRoute,
  useNavigation,
  RouteProp,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import createStyles, { FONT_SIZES } from "../context/appStyles";
import { db } from "../../firebaseConfig";
import {
  onSnapshot,
  doc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { LineChart } from "react-native-chart-kit";
import { RootStackParamList, CatalogItem } from "../../types";
import OrdersPanel from "./components/OrdersPanel";
const SCREEN_WIDTH = Dimensions.get("window").width;

type MyBusinessNavProp = StackNavigationProp<RootStackParamList, "MyBusinessScreen">;
type MyBusinessRouteProp = RouteProp<RootStackParamList, "MyBusinessScreen">;

type OrderItem = { name: string; qty: number; price: number };
type Order = {
  id: string;
  total: number;
  createdAt: any;
  items: OrderItem[];
};

const MyBusinessScreen = () => {
  const navigation = useNavigation<MyBusinessNavProp>();
  const route = useRoute<MyBusinessRouteProp>();
  const { businessId } = route.params;

  const { colors } = useTheme();
  const styles = createStyles(colors).myBusinessScreen;
  const global = createStyles(colors).global;

    const selectedBusinessId = route.params?.businessId;

  // Business state (live)
  const [loading, setLoading] = useState(true);
  const [bizName, setBizName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  // Menu & analytics
  const [menuVisible, setMenuVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalRevenue: number;
    totalOrders: number;
    mostPopularItem: string;
    chartLabels: string[];
    chartData: number[];
  } | null>(null);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortKey, setSortKey] = useState<"name" | "price">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showAll, setShowAll] = useState<boolean>(false); // keep grid 2×10 by default

  // Live business doc
  useEffect(() => {
    const ref = doc(db, "businesses", businessId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const d: any = snap.data();
          setBizName(d.name ?? "");
          setDescription(d.description ?? "");
          setLocation(d.location ?? "");
          setType(d.type ?? "");
          setCoverImageUrl(d.imageUrl ?? null);
          setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
        }
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot business error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  // Load analytics only when user opens the modal
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("businessId", "==", businessId),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const allOrders: Order[] = [];
        snap.forEach((doc) =>
          allOrders.push({ id: doc.id, ...(doc.data() as Omit<Order, "id">) })
        );

        let totalRevenue = 0;
        let totalOrders = 0;
        const itemCount: Record<string, number> = {};
        const revenueByDay: Record<string, number> = {};

        allOrders.forEach((order) => {
          totalRevenue += order.total || 0;
          totalOrders++;
          order.items?.forEach((i: OrderItem) => {
            itemCount[i.name] = (itemCount[i.name] || 0) + (i.qty || 1);
          });
          const dateObj = order.createdAt?.toDate?.();
          if (dateObj) {
            const day = dateObj.toISOString().slice(0, 10);
            revenueByDay[day] = (revenueByDay[day] || 0) + (order.total || 0);
          }
        });

        const mostPopularItem =
          Object.entries(itemCount)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name)[0] || "N/A";

        const sortedDays = Object.keys(revenueByDay).sort();
        const revenueData = sortedDays.map((d) => revenueByDay[d]);

        setOrders(allOrders);
        setAnalytics({
          totalRevenue,
          totalOrders,
          mostPopularItem,
          chartLabels: sortedDays,
          chartData: revenueData,
        });
      } catch (e) {
        console.warn("analytics load failed", e);
        setOrders([]);
        setAnalytics(null);
      }
    };

    if (analyticsVisible) fetchAnalytics();
  }, [analyticsVisible, businessId]);

  // Derived list of categories from catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => {
      const cat = (c as any)?.category ?? "";
      if (cat) set.add(cat);
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [catalog]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const min = minPrice ? parseFloat(minPrice.replace(",", ".")) : undefined;
    const max = maxPrice ? parseFloat(maxPrice.replace(",", ".")) : undefined;

    let list = [...catalog];

    // search name/description
    if (q) {
      list = list.filter((it) => {
        const name = (it.name ?? "").toLowerCase();
        const desc = (it.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    // category
    if (selectedCategory !== "All") {
      list = list.filter(
        (it) => ((it as any).category ?? "") === selectedCategory
      );
    }

    // in-stock
    if (inStockOnly) {
      list = list.filter((it) => {
        const qty = Number((it as any).quantity ?? 0);
        return qty > 0;
      });
    }

    // price range
    if (typeof min === "number" && !Number.isNaN(min)) {
      list = list.filter((it) => Number(it.price ?? 0) >= min);
    }
    if (typeof max === "number" && !Number.isNaN(max)) {
      list = list.filter((it) => Number(it.price ?? 0) <= max);
    }

    // sort
    list.sort((a, b) => {
      const av = sortKey === "name"
        ? String(a.name ?? "")
        : Number(a.price ?? 0);
      const bv = sortKey === "name"
        ? String(b.name ?? "")
        : Number(b.price ?? 0);

      let cmp = 0;
      if (sortKey === "name") {
        cmp = (av as string).localeCompare(bv as string);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [catalog, searchQuery, selectedCategory, inStockOnly, minPrice, maxPrice, sortKey, sortDir]);

  const gridData = useMemo(
    () => (showAll ? filtered : filtered.slice(0, 20)),
    [filtered, showAll]
  );

  const initials = useMemo(
    () =>
      bizName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase(),
    [bizName]
  );

  const openEdit = () => {
    navigation.navigate("EditBusinessScreen", {
      businessId,
      businessName: bizName,
      coverImageUrl,
      description,
      location,
      type,
      catalog,
    });
  };

  const renderItem = ({ item }: { item: CatalogItem }) => {
    const qty = Number((item as any).quantity ?? 0);
    const cat = (item as any).category ?? "";
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
            style={{
              width: "100%",
              height: 90,
              borderRadius: 10,
              marginBottom: 8,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: 90,
              borderRadius: 10,
              marginBottom: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#00000010",
            }}
          >
            <Ionicons name="image-outline" size={28} color={colors.secondaryText} />
          </View>
        )}

        <Text
          numberOfLines={1}
          style={{ color: colors.textPrimary, fontWeight: "700" }}
        >
          {item.name}
        </Text>
        {!!cat && (
          <Text
            numberOfLines={1}
            style={{ color: colors.secondaryText, fontSize: 12, marginTop: 2 }}
          >
            {cat}
          </Text>
        )}
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            R{Number(item.price ?? 0).toFixed(2)}
          </Text>
          <Text
            style={{
              color: qty > 0 ? colors.secondaryText : colors.error,
              fontSize: 12,
            }}
          >
            {qty > 0 ? `Stock: ${qty}` : "Out of stock"}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={global.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
          My Business
        </Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 6 }}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Business Image */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {coverImageUrl ? (
            <Image
              source={{ uri: coverImageUrl }}
              style={{
                width: "100%",
                height: 160,
                borderRadius: 16,
                backgroundColor: colors.cardBackground,
              }}
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 160,
                borderRadius: 16,
                backgroundColor: colors.cardBackground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.secondaryText, fontSize: 34, fontWeight: "800" }}>
                {initials}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "800" }}>
            {bizName}
          </Text>
          <Text style={{ color: colors.secondaryText, marginTop: 6 }}>
            {description}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, marginLeft: 6 }}>{location}</Text>
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={colors.secondaryText}
              style={{ marginLeft: 12 }}
            />
            <Text style={{ color: colors.textPrimary, marginLeft: 6 }}>{type}</Text>
          </View>
        </View>

        {/* Search & Filters */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderColor,
              backgroundColor: colors.cardBackground,
              paddingHorizontal: 10,
              height: 44,
            }}
          >
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, color: colors.textPrimary }}
              placeholder="Search catalog (name or description)"
              placeholderTextColor={colors.placeholderText as string}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ paddingRight: 6 }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 14,
                    marginRight: 8,
                    borderWidth: 1,
                    backgroundColor: active ? colors.primary : colors.cardBackground,
                    borderColor: active ? colors.primary : colors.borderColor,
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.buttonText : colors.textPrimary,
                      fontWeight: active ? "700" : "500",
                      fontSize: 12,
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Filter row */}
          <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}
              >
                Min R
              </Text>
              <TextInput
                style={{
                  height: 38,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  color: colors.textPrimary,
                  backgroundColor: colors.cardBackground,
                }}
                keyboardType="decimal-pad"
                value={minPrice}
                onChangeText={setMinPrice}
                placeholder="0"
                placeholderTextColor={colors.placeholderText as string}
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}
              >
                Max R
              </Text>
              <TextInput
                style={{
                  height: 38,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  color: colors.textPrimary,
                  backgroundColor: colors.cardBackground,
                }}
                keyboardType="decimal-pad"
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholder="9999"
                placeholderTextColor={colors.placeholderText as string}
              />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                In stock
              </Text>
              <Switch
                value={inStockOnly}
                onValueChange={setInStockOnly}
                trackColor={{ false: colors.secondaryText, true: colors.primary }}
                thumbColor={colors.cardBackground}
              />
            </View>
          </View>

          {/* Sort controls */}
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: colors.secondaryText, marginRight: 8 }}>Sort:</Text>
              <TouchableOpacity
                onPress={() => setSortKey(sortKey === "name" ? "price" : "name")}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  backgroundColor: colors.cardBackground,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: colors.textPrimary }}>
                  {sortKey === "name" ? "Name" : "Price"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  backgroundColor: colors.cardBackground,
                }}
              >
                <Text style={{ color: colors.textPrimary }}>
                  {sortDir === "asc" ? "Asc" : "Desc"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setInStockOnly(false);
                setMinPrice("");
                setMaxPrice("");
                setSortKey("name");
                setSortDir("asc");
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.borderColor,
              }}
            >
              <Text style={{ color: colors.textPrimary }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grid header */}
        <View
          style={{
            marginTop: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>
            Catalog
          </Text>
          {filtered.length > 20 && (
            <TouchableOpacity onPress={() => setShowAll((s) => !s)}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {showAll ? "Show 20" : `Show all (${filtered.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2×10 Grid (numColumns=2) */}
        <FlatList
          data={gridData}
          keyExtractor={(item, i) => (item.id ?? `${item.name}-${i}`)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 10 }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: "center",
                color: colors.secondaryText,
                marginTop: 20,
              }}
            >
              No items match your filters.
            </Text>
          }
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Top-right menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "#00000040" }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              top: 50,
              right: 12,
              width: 210,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderColor,
              paddingVertical: 6,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                openEdit();
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
              <Text style={{ marginLeft: 8, color: colors.textPrimary }}>
                Edit business
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                setAnalyticsVisible(true);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="stats-chart-outline" size={18} color={colors.textPrimary} />
              <Text style={{ marginLeft: 8, color: colors.textPrimary }}>
                Business analytics
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Analytics modal */}
      <Modal
        visible={analyticsVisible}
        animationType="slide"
        onRequestClose={() => setAnalyticsVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
            <TouchableOpacity onPress={() => setAnalyticsVisible(false)} style={{ padding: 6 }}>
              <Ionicons name="close-outline" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                textAlign: "center",
                color: colors.textPrimary,
                fontWeight: "800",
                fontSize: 18,
              }}
            >
              Business Analytics
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
           
<OrdersPanel businessId={selectedBusinessId} />

         </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default MyBusinessScreen;
