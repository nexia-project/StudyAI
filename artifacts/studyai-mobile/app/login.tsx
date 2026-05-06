import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth, API_BASE } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = `${API_BASE}/api/callback`;

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const loginUrl = `${API_BASE}/api/login?returnTo=${encodeURIComponent(API_BASE + "/api/mobile-auth/token-exchange")}`;
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, API_BASE);

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        if (token) {
          await login(token);
          router.replace("/(tabs)/home");
          return;
        }
      }
      setError("Login cancelado. Tente novamente.");
    } catch (e) {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const styles = makeStyles(colors, insets);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🧠</Text>
        </View>
        <Text style={styles.appName}>StudyAI</Text>
        <Text style={styles.tagline}>Seu professor de IA{"\n"}para o ENEM e vestibulares</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: "message-circle", text: "Professor Tiagão com IA" },
          { icon: "target", text: "Simulados adaptativos" },
          { icon: "award", text: "Ranking e conquistas" },
          { icon: "clock", text: "Pomodoro e flashcards" },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Feather name={f.icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed]}
          onPress={handleLogin}
          disabled={loading || isLoading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="log-in" size={20} color="#fff" />
              <Text style={styles.loginBtnText}>Entrar com Replit</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.terms}>
          Ao entrar, você concorda com os nossos termos de uso e política de privacidade.
        </Text>
      </View>
    </View>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: isWeb ? 67 : insets.top,
      paddingBottom: isWeb ? 34 : insets.bottom,
      paddingHorizontal: 28,
      justifyContent: "space-between",
    },
    hero: {
      alignItems: "center",
      paddingTop: 48,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    iconEmoji: {
      fontSize: 48,
    },
    appName: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
    },
    tagline: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 24,
    },
    features: {
      gap: 14,
      paddingVertical: 8,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      flex: 1,
    },
    bottomSection: {
      gap: 14,
    },
    errorBox: {
      backgroundColor: "#fee2e2",
      borderRadius: 12,
      padding: 14,
    },
    errorText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: "#dc2626",
      textAlign: "center",
    },
    loginBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    loginBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    loginBtnText: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    terms: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 8,
    },
  });
}
