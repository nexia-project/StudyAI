import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_GREETING =
  "Aqui é o Tiagão! 👨‍🏫 Seu professor de estudos. Como posso te ajudar hoje? Pode me perguntar sobre qualquer matéria, pedir explicações, ou me dizer no que você quer focar!";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { profile } = useProfile();
  const isWeb = Platform.OS === "web";

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: SYSTEM_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const flatRef = useRef<FlatList>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setStreaming("");

    const history = newMessages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API_BASE}/api/professor/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history: history.slice(-8),
          studentName: profile.nome || "Estudante",
          studentGrade: profile.serie || "",
          studentGoal: profile.objetivo || "enem",
        }),
      });

      if (!res.ok || !res.body) throw new Error("Falha ao conectar");

      let full = "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              full += delta;
              setStreaming(full);
            } catch {}
          }
        }
      }

      if (full) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString() + "r", role: "assistant", content: full },
        ]);
        setStreaming("");
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "err",
          role: "assistant",
          content: "Ops! Não consegui responder agora. Tente novamente! 😅",
        },
      ]);
    } finally {
      setSending(false);
      setStreaming("");
    }
  }

  const styles = makeStyles(colors, insets, isWeb);

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>T</Text>
          </View>
        )}
        <View style={[styles.bubbleInner, isUser ? styles.userInner : styles.aiInner]}>
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const streamingItem: Message | null = streaming
    ? { id: "streaming", role: "assistant", content: streaming + "▊" }
    : null;

  const displayMessages = streamingItem
    ? [...messages, streamingItem]
    : messages;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.professorAvatar}>
          <Text style={styles.professorEmoji}>👨‍🏫</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>Professor Tiagão</Text>
          <Text style={styles.headerSub}>Seu tutor de IA</Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!displayMessages.length}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={sending && !streaming ? (
          <View style={[styles.bubble, styles.aiBubble]}>
            <View style={styles.avatarCircle}><Text style={styles.avatarText}>T</Text></View>
            <View style={[styles.bubbleInner, styles.aiInner]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        ) : null}
      />

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Pergunte algo ao Tiagão..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled, pressed && styles.sendBtnPressed]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Feather name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: isWeb ? 67 + 12 : insets.top + 12,
      paddingBottom: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    professorAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    professorEmoji: { fontSize: 22 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    messageList: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    bubble: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
    userBubble: { justifyContent: "flex-end" },
    aiBubble: { justifyContent: "flex-start" },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
    bubbleInner: {
      maxWidth: "78%",
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userInner: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    aiInner: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    userText: { fontFamily: "Inter_400Regular", color: "#fff" },
    aiText: { fontFamily: "Inter_400Regular", color: colors.foreground },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      backgroundColor: colors.background,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    sendBtnDisabled: { opacity: 0.45 },
    sendBtnPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  });
}
