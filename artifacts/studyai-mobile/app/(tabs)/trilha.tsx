import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
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

const SUBJECTS = [
  { id: "matematica", label: "Matemática", emoji: "📐", color: "#6366f1" },
  { id: "portugues", label: "Português", emoji: "📚", color: "#ec4899" },
  { id: "fisica", label: "Física", emoji: "⚛️", color: "#06b6d4" },
  { id: "quimica", label: "Química", emoji: "🧪", color: "#10b981" },
  { id: "biologia", label: "Biologia", emoji: "🧬", color: "#84cc16" },
  { id: "historia", label: "História", emoji: "🏛️", color: "#f59e0b" },
  { id: "geografia", label: "Geografia", emoji: "🌎", color: "#3b82f6" },
  { id: "redacao", label: "Redação", emoji: "✍️", color: "#a855f7" },
];

const LEVEL_LABELS = ["Iniciante", "Aprendiz", "Praticante", "Avançado", "Mestre"];

interface SubjectStatus {
  subject: string;
  level: number;
  diagnosticDone: boolean;
  totalSessions: number;
  lastSession: string | null;
}

export default function TrilhaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, SubjectStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const results = await Promise.all(
        SUBJECTS.map(async (s) => {
          const res = await fetch(`${API_BASE}/api/trilha/status?subject=${s.id}`, {
            credentials: "include",
          });
          if (!res.ok) return [s.id, null] as const;
          const data = await res.json();
          return [s.id, data] as const;
        })
      );
      const map: Record<string, SubjectStatus> = {};
      results.forEach(([id, data]) => { if (data) map[id] = data; });
      setStatuses(map);
    } catch (e) {
      console.warn("Trilha load failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_500Medium" }}>
          Faça login para acessar a Trilha
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const totalLevel = Object.values(statuses).reduce((s, v) => s + (v?.level ?? 0), 0);
  const masteredCount = Object.values(statuses).filter(s => (s?.level ?? 0) >= 5).length;
  const diagnosticsDone = Object.values(statuses).filter(s => s?.diagnosticDone).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>Trilha do Mestre</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          5 níveis por matéria, do iniciante ao mestre
        </Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{totalLevel}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Níveis totais</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: "#10b981" }]}>{masteredCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Maestrias</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: "#f59e0b" }]}>{diagnosticsDone}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Diagnósticos</Text>
        </View>
      </View>

      {/* Subject grid */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Matérias</Text>
      <View style={{ gap: 10 }}>
        {SUBJECTS.map(subj => {
          const st = statuses[subj.id];
          const level = st?.level ?? 0;
          const pct = (level / 5) * 100;
          return (
            <Pressable
              key={subj.id}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={({ pressed }) => [
                styles.subjectCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.subjectIcon, { backgroundColor: `${subj.color}20` }]}>
                <Text style={{ fontSize: 24 }}>{subj.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.subjectName, { color: colors.foreground }]}>{subj.label}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: `${subj.color}20` }]}>
                    <Text style={[styles.levelBadgeText, { color: subj.color }]}>
                      Nv {level}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.subjectStatus, { color: colors.mutedForeground }]}>
                  {LEVEL_LABELS[level] ?? "Iniciante"}
                  {st?.diagnosticDone ? " • diagnóstico ok" : " • sem diagnóstico"}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: subj.color }]} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, fontSize: 13, flex: 1, fontFamily: "Inter_400Regular" }}>
          A Trilha completa, com geração de questões e diagnóstico adaptativo, está disponível na versão web em{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>study.ia.br</Text>.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, marginTop: 4, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: "center" },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, marginTop: 2, fontFamily: "Inter_500Medium" },
  subjectCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 16 },
  subjectIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  subjectName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subjectStatus: { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  levelBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  progressBar: { height: 6, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  tipCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 14, borderWidth: 1, borderRadius: 14 },
});
