import { Feather } from "@expo/vector-icons";
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
import { useColors } from "@/hooks/useColors";

interface RankEntry {
  id: string;
  displayName: string;
  xp: number;
  simCount: number;
  tier: { name: string; emoji: string; color: string };
  rank: number;
}

interface RankingData {
  leaderboard: RankEntry[];
  currentUser: RankEntry | null;
  totalPlayers: number;
}

const SEGMENTS = [
  { key: "todos", label: "Todos" },
  { key: "medio", label: "Médio" },
  { key: "superior", label: "Superior" },
  { key: "cursinho", label: "Cursinho" },
  { key: "fundamental", label: "Fund." },
];

export default function RankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [data, setData] = useState<RankingData | null>(null);
  const [segment, setSegment] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isWeb = Platform.OS === "web";

  async function load(seg = segment) {
    if (!token) return;
    try {
      const url = seg === "todos" ? `${API_BASE}/api/ranking` : `${API_BASE}/api/ranking?segment=${seg}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleSegment(seg: string) {
    setSegment(seg);
    setLoading(true);
    load(seg);
  }

  useEffect(() => { load(); }, [token]);

  const styles = makeStyles(colors, insets, isWeb);
  const me = data?.currentUser;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Ranking</Text>
        <Text style={styles.subtitle}>
          {data ? `${data.totalPlayers} estudantes` : "Carregando..."}
        </Text>
      </View>

      {/* Segment filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SEGMENTS.map(seg => (
            <Pressable
              key={seg.key}
              style={[styles.segBtn, segment === seg.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => handleSegment(seg.key)}
            >
              <Text style={[styles.segText, segment === seg.key && { color: "#fff" }]}>{seg.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* My position */}
      {me && (
        <View style={[styles.meCard, { borderColor: colors.primary + "50" }]}>
          <Text style={styles.meRank}>#{me.rank}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.meName}>{me.displayName} (você)</Text>
            <Text style={styles.meTier}>{me.tier.emoji} {me.tier.name}</Text>
          </View>
          <Text style={[styles.meXP, { color: colors.primary }]}>{me.xp.toLocaleString("pt-BR")} XP</Text>
        </View>
      )}

      {/* Leaderboard */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : !data?.leaderboard.length ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={36} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nenhum estudante nesse segmento ainda.</Text>
        </View>
      ) : (
        data.leaderboard.map((entry, i) => {
          const isMe = entry.id === me?.id;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

          return (
            <View key={entry.id} style={[styles.row, isMe && { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
              <Text style={styles.rowRank}>
                {medal ?? `#${entry.rank}`}
              </Text>
              <View style={[styles.rowAvatar, { backgroundColor: entry.tier.color + "25" }]}>
                <Text style={[styles.rowAvatarText, { color: entry.tier.color }]}>
                  {entry.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, isMe && { color: colors.primary }]} numberOfLines={1}>{entry.displayName}</Text>
                <Text style={styles.rowTier}>{entry.tier.emoji} {entry.tier.name} · {entry.simCount} simulados</Text>
              </View>
              <Text style={styles.rowXP}>{entry.xp.toLocaleString("pt-BR")}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: isWeb ? 67 + 20 : insets.top + 20,
      paddingBottom: isWeb ? 34 + 100 : insets.bottom + 100,
      paddingHorizontal: 20,
    },
    header: { marginBottom: 20 },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    segBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    },
    segText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    meCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      gap: 12,
    },
    meRank: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary, width: 42 },
    meName: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    meTier: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    meXP: { fontSize: 16, fontFamily: "Inter_700Bold" },
    emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
    emptyText: { fontFamily: "Inter_500Medium", color: colors.mutedForeground, textAlign: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
      gap: 12,
    },
    rowRank: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.mutedForeground, width: 36, textAlign: "center" },
    rowAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    rowAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
    rowName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    rowTier: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    rowXP: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.mutedForeground },
  });
}
