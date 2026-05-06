import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

const GOALS = [
  { key: "enem", label: "ENEM" },
  { key: "vestibular", label: "Vestibular" },
  { key: "concurso", label: "Concurso Público" },
  { key: "escola", label: "Escola Regular" },
  { key: "faculdade", label: "Faculdade" },
];

const GRADES = [
  "6° Ano Fund.", "7° Ano Fund.", "8° Ano Fund.", "9° Ano Fund.",
  "1° Ano EM", "2° Ano EM", "3° Ano EM",
  "Cursinho", "Faculdade / Superior", "Concurso Público",
];

export default function PerfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { profile, setProfile, refreshStats } = useProfile();
  const [nome, setNome] = useState(profile.nome);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isWeb = Platform.OS === "web";

  const { token } = useAuth();

  async function save() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentName: nome }),
      });
      setProfile({ nome });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  async function handleLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sair", "Tem certeza que quer sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/login"); } },
    ]);
  }

  const displayName = profile.nome || user?.firstName || "Estudante";
  const styles = makeStyles(colors, insets, isWeb);

  const infoItems = [
    { icon: "mail", label: "Email", value: user?.email ?? "—" },
    { icon: "award", label: "Tier", value: `${profile.tierEmoji} ${profile.tier}` },
    { icon: "zap", label: "XP Total", value: profile.xp.toLocaleString("pt-BR") + " XP" },
    { icon: "flame" as any, label: "Sequência", value: `${profile.streak} dias 🔥` },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Avatar + name */}
      <View style={styles.heroSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.heroName}>{displayName}</Text>
        <Text style={styles.heroSub}>{profile.tier !== "Bronze" ? `${profile.tierEmoji} ${profile.tier}` : "Bronze 🥉"} · {profile.xp.toLocaleString("pt-BR")} XP</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: "XP", value: profile.xp.toLocaleString("pt-BR") },
          { label: "Streak", value: `${profile.streak}d` },
          { label: "Tier", value: profile.tierEmoji },
        ].map((s, i) => (
          <View key={i} style={[styles.statBox, { borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Edit name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meu apelido</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          value={nome}
          onChangeText={setNome}
          placeholder="Como você quer ser chamado?"
          placeholderTextColor={colors.mutedForeground}
        />
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: saved ? colors.success : colors.primary }, pressed && { opacity: 0.85 }]}
          onPress={save}
          disabled={saving}
        >
          <Feather name={saved ? "check" : "save"} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}</Text>
        </Pressable>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações</Text>
        {infoItems.map((item, i) => (
          <View key={i} style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={item.icon as any} size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, { borderColor: colors.destructive + "40", backgroundColor: colors.card }, pressed && { opacity: 0.7 }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
      </Pressable>
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
    heroSection: { alignItems: "center", marginBottom: 24 },
    avatarLarge: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      marginBottom: 12,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    avatarLargeText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
    heroName: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground },
    heroSub: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 4 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
    statBox: {
      flex: 1, alignItems: "center", paddingVertical: 14,
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1,
    },
    statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 12 },
    input: {
      borderRadius: colors.radius, borderWidth: 1,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    saveBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, borderRadius: colors.radius, paddingVertical: 14,
    },
    saveBtnText: { fontFamily: "Inter_700Bold", color: "#fff", fontSize: 15 },
    infoRow: {
      flexDirection: "row", alignItems: "center", gap: 14,
      borderRadius: colors.radius, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8,
    },
    infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
    infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    logoutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 10, borderRadius: colors.radius, borderWidth: 1.5, paddingVertical: 16, marginBottom: 16,
    },
    logoutText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  });
}
