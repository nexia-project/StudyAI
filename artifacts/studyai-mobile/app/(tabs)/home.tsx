import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

interface FeedItem {
  type: string;
  materia?: string;
  topicos?: string[];
  score?: number;
  total?: number;
  created_at: string;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "#cd7c3a",
  Prata: "#94a3b8",
  Ouro: "#f59e0b",
  Platina: "#a855f7",
  Diamante: "#06b6d4",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { profile, refreshStats } = useProfile();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadFeed() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeed((data.entries ?? []).slice(0, 5));
      }
    } catch {}
    setFeedLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshStats(), loadFeed()]);
    setRefreshing(false);
  }

  useEffect(() => {
    loadFeed();
  }, [token]);

  const tierColor = TIER_COLORS[profile.tier] ?? colors.primary;
  const nextTierXp =
    profile.tier === "Bronze" ? 500 :
    profile.tier === "Prata" ? 1500 :
    profile.tier === "Ouro" ? 3000 :
    profile.tier === "Platina" ? 6000 : 9999;
  const prevTierXp =
    profile.tier === "Bronze" ? 0 :
    profile.tier === "Prata" ? 500 :
    profile.tier === "Ouro" ? 1500 :
    profile.tier === "Platina" ? 3000 : 6000;
  const tierProgress = Math.min(1, (profile.xp - prevTierXp) / Math.max(1, nextTierXp - prevTierXp));

  const displayName = profile.nome || user?.firstName || "Estudante";
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);

  const quickActions = [
    { icon: "message-circle", label: "Tiagão", color: colors.primary, onPress: () => router.push("/(tabs)/chat") },
    { icon: "target", label: "Simulado", color: "#ec4899", onPress: () => router.push("/(tabs)/estudar") },
    { icon: "layers", label: "Flashcards", color: "#10b981", onPress: () => router.push("/(tabs)/estudar") },
    { icon: "clock", label: "Pomodoro", color: "#f59e0b", onPress: () => router.push("/(tabs)/estudar") },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Oi, {displayName}! 👋</Text>
          <Text style={styles.subtitle}>Bora estudar hoje?</Text>
        </View>
        <Pressable
          style={styles.avatarBtn}
          onPress={() => router.push("/(tabs)/perfil")}
        >
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      {/* XP / Tier card */}
      <View style={[styles.xpCard, { borderColor: tierColor + "40" }]}>
        <View style={styles.xpTop}>
          <View>
            <Text style={styles.xpLabel}>Seu nível</Text>
            <Text style={[styles.tierName, { color: tierColor }]}>
              {profile.tierEmoji} {profile.tier}
            </Text>
          </View>
          <View style={styles.xpRight}>
            <Text style={[styles.xpNumber, { color: tierColor }]}>
              {profile.xp.toLocaleString("pt-BR")}
            </Text>
            <Text style={styles.xpUnit}>XP</Text>
          </View>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${tierProgress * 100}%` as any, backgroundColor: tierColor }]} />
        </View>
        {profile.tier !== "Diamante" && (
          <Text style={styles.xpRemaining}>
            {(nextTierXp - profile.xp).toLocaleString("pt-BR")} XP para {
              profile.tier === "Bronze" ? "Prata 🥈" :
              profile.tier === "Prata" ? "Ouro 🥇" :
              profile.tier === "Ouro" ? "Platina 🔮" : "Diamante 💎"
            }
          </Text>
        )}

        {/* Streak */}
        <View style={styles.streakRow}>
          <Feather name="zap" size={14} color="#f59e0b" />
          <Text style={styles.streakText}>
            {profile.streak > 0 ? `${profile.streak} dias seguidos 🔥` : "Comece sua sequência hoje!"}
          </Text>
        </View>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Começar</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: action.color + "15", borderColor: action.color + "30" }, pressed && styles.quickBtnPressed]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); action.onPress(); }}
          >
            <View style={[styles.quickIcon, { backgroundColor: action.color + "20" }]}>
              <Feather name={action.icon as any} size={22} color={action.color} />
            </View>
            <Text style={[styles.quickLabel, { color: action.color }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Recent activity */}
      <Text style={styles.sectionTitle}>Atividade recente</Text>
      {feedLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : feed.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="book-open" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nenhuma atividade ainda.{"\n"}Comece a estudar!</Text>
        </View>
      ) : (
        feed.map((item, i) => (
          <View key={i} style={styles.feedItem}>
            <View style={[styles.feedIcon, { backgroundColor: item.type === "simulado" ? "#ec489920" : item.type === "flashcard" ? "#10b98120" : colors.secondary }]}>
              <Feather
                name={item.type === "simulado" ? "target" : item.type === "flashcard" ? "layers" : "book"}
                size={16}
                color={item.type === "simulado" ? "#ec4899" : item.type === "flashcard" ? "#10b981" : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feedTitle}>
                {item.type === "simulado" ? `Simulado: ${item.materia ?? "Geral"}` :
                 item.type === "flashcard" ? "Sessão de flashcards" :
                 item.type === "plano" ? `Plano: ${item.materia ?? "Estudo"}` : item.type}
              </Text>
              {item.score !== undefined && (
                <Text style={styles.feedSub}>{item.score}/{item.total} acertos</Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: isWeb ? 67 + 16 : insets.top + 16,
      paddingBottom: isWeb ? 34 + 100 : insets.bottom + 100,
      paddingHorizontal: 20,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    greeting: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
    xpCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1.5,
      padding: 18,
      marginBottom: 24,
      shadowColor: "#6366f1",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    xpTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    xpLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 2 },
    tierName: { fontSize: 20, fontFamily: "Inter_700Bold" },
    xpRight: { alignItems: "flex-end" },
    xpNumber: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
    xpUnit: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    xpBarBg: { height: 8, backgroundColor: colors.muted, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
    xpBarFill: { height: 8, borderRadius: 4 },
    xpRemaining: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 10 },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
    streakText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 12, marginTop: 4 },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
    quickBtn: {
      width: "47%",
      borderRadius: colors.radius,
      borderWidth: 1,
      padding: 16,
      alignItems: "center",
      gap: 8,
    },
    quickBtnPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
    quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    quickLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
    emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22 },
    feedItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 10,
    },
    feedIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    feedTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    feedSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
  });
}
