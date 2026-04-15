import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  "Aqui é o Tiagão! 👨‍🏫 Seu professor de estudos. Como posso te ajudar hoje? Pode me perguntar sobre qualquer matéria, pedir explicações, ou ativar o modo voz pra estudarmos juntos!";

// Play base64 MP3 audio with expo-av
async function playBase64Audio(base64: string): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    });
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: `data:audio/mpeg;base64,${base64}` });
    await sound.playAsync();
    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          resolve();
        }
      });
    });
  } catch (e) {
    console.warn("Audio playback error:", e);
  }
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { profile } = useProfile();
  const isWeb = Platform.OS === "web";

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: SYSTEM_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const flatRef = useRef<FlatList>(null);

  // Voice mode state
  const [voiceMode, setVoiceMode] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Pulse animation for recording
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }

  // Request mic permission + proactive greeting on voice mode enter
  async function enterVoiceMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      setHasPermission(false);
      return;
    }
    setHasPermission(true);
    setVoiceMode(true);
    // Proactive greeting via TTS
    triggerProactiveVoice("page_return");
  }

  function exitVoiceMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceMode(false);
  }

  // Proactive Tiagão greeting
  async function triggerProactiveVoice(reason: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/professor/voice-proactive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          triggerReason: reason,
          context: {
            nome: profile.nome,
            serie: profile.serie,
            objetivo: profile.objetivo,
            xp: profile.xp,
          },
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.message) {
        const msgId = Date.now().toString() + "_proactive";
        setMessages((prev) => [...prev, { id: msgId, role: "assistant", content: data.message }]);
        // Speak it
        await speakText(data.message);
      }
    } catch {}
  }

  // TTS: speak text
  async function speakText(text: string) {
    if (!token || isWeb) return;
    setIsSpeaking(true);
    try {
      const res = await fetch(`${API_BASE}/api/professor/voice-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, base64: true }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audio) {
        await playBase64Audio(data.audio);
      }
    } catch (e) {
      console.warn("TTS error:", e);
    } finally {
      setIsSpeaking(false);
    }
  }

  // Start recording
  async function startRecording() {
    if (isRecording || isSpeaking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      startPulse();
    } catch (e) {
      console.warn("Recording start error:", e);
    }
  }

  // Stop recording + transcribe + send
  async function stopRecordingAndSend() {
    if (!recording || !isRecording) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopPulse();
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      // Transcribe with Whisper
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as any);

      const transRes = await fetch(`${API_BASE}/api/professor/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setIsTranscribing(false);

      if (!transRes.ok) return;
      const transData = await transRes.json();
      const text = transData.text?.trim();
      if (!text) return;

      // Show user message + send to chat
      await sendToChat(text);
    } catch (e) {
      console.warn("Stop recording error:", e);
      setIsTranscribing(false);
      setRecording(null);
      setIsRecording(false);
    }
  }

  // Core: send message to chat API (text)
  async function sendToChat(text: string) {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        for (const line of chunk.split("\n")) {
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
        const assistantMsg: Message = { id: Date.now().toString() + "r", role: "assistant", content: full };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreaming("");
        // Speak in voice mode
        if (voiceMode) {
          await speakText(full);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "err", role: "assistant", content: "Ops! Não consegui responder agora. Tente novamente! 😅" },
      ]);
    } finally {
      setSending(false);
      setStreaming("");
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendToChat(text);
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
  const displayMessages = streamingItem ? [...messages, streamingItem] : messages;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.professorAvatar}>
          <Text style={styles.professorEmoji}>👨‍🏫</Text>
          {isSpeaking && (
            <View style={styles.speakingDot} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Professor Tiagão</Text>
          <Text style={styles.headerSub}>
            {isSpeaking ? "Falando..." : isTranscribing ? "Transcrevendo..." : isRecording ? "Ouvindo..." : voiceMode ? "Modo voz ativo 🎙️" : "Seu tutor de IA"}
          </Text>
        </View>
        <Pressable
          style={[styles.voiceModeBtn, voiceMode && { backgroundColor: colors.primary }]}
          onPress={voiceMode ? exitVoiceMode : enterVoiceMode}
        >
          <Feather name={voiceMode ? "mic-off" : "mic"} size={18} color={voiceMode ? "#fff" : colors.primary} />
        </Pressable>
      </View>

      {/* Permission denied banner */}
      {hasPermission === false && (
        <View style={styles.permissionBanner}>
          <Feather name="alert-triangle" size={14} color="#92400e" />
          <Text style={styles.permissionText}>Permissão de microfone negada. Habilite nas configurações.</Text>
        </View>
      )}

      {/* Voice mode overlay */}
      {voiceMode && (
        <View style={styles.voiceOverlay}>
          <View style={styles.voiceCard}>
            <Text style={styles.voiceTitle}>Modo Voz Ativo</Text>
            <Text style={styles.voiceSub}>
              {isTranscribing ? "Transcrevendo sua fala..." :
               isSpeaking ? "Tiagão está falando..." :
               isRecording ? "Ouvindo... solte para enviar" :
               "Segure o botão e fale"}
            </Text>

            {/* Big mic button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginVertical: 20 }}>
              <Pressable
                style={[
                  styles.bigMicBtn,
                  isRecording && styles.bigMicBtnActive,
                  (isTranscribing || isSpeaking) && styles.bigMicBtnDisabled,
                ]}
                onPressIn={startRecording}
                onPressOut={stopRecordingAndSend}
                disabled={isTranscribing || isSpeaking}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : isSpeaking ? (
                  <Feather name="volume-2" size={40} color="#fff" />
                ) : (
                  <Feather name="mic" size={40} color="#fff" />
                )}
              </Pressable>
            </Animated.View>

            <Text style={styles.voiceHint}>
              {isRecording ? "🔴 Gravando..." : "Ou tipo no campo abaixo"}
            </Text>

            {/* Last messages in voice mode */}
            {messages.length > 1 && (
              <View style={styles.lastMsgBox}>
                <Text style={styles.lastMsgLabel}>Última resposta:</Text>
                <Text style={styles.lastMsgText} numberOfLines={3}>
                  {messages.filter(m => m.role === "assistant").slice(-1)[0]?.content}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Message list (hidden in voice mode) */}
      {!voiceMode && (
        <FlatList
          ref={flatRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!displayMessages.length}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            sending && !streaming ? (
              <View style={[styles.bubble, styles.aiBubble]}>
                <View style={styles.avatarCircle}><Text style={styles.avatarText}>T</Text></View>
                <View style={[styles.bubbleInner, styles.aiInner]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input row */}
      <View style={[styles.inputRow, { paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={voiceMode ? "Ou escreva aqui..." : "Pergunte algo ao Tiagão..."}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
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
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      position: "relative",
    },
    professorEmoji: { fontSize: 22 },
    speakingDot: {
      position: "absolute", bottom: 0, right: 0,
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: "#10b981", borderWidth: 2, borderColor: "#fff",
    },
    headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    voiceModeBtn: {
      width: 38, height: 38, borderRadius: 19,
      borderWidth: 1.5, borderColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    permissionBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#fef3c7", paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: "#fde68a",
    },
    permissionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#92400e", flex: 1 },
    voiceOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    voiceCard: {
      width: "100%", backgroundColor: colors.card,
      borderRadius: 24, borderWidth: 1, borderColor: colors.border,
      padding: 28, alignItems: "center",
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
    },
    voiceTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    voiceSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    bigMicBtn: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
    },
    bigMicBtnActive: { backgroundColor: "#ef4444", shadowColor: "#ef4444" },
    bigMicBtnDisabled: { backgroundColor: colors.muted, shadowOpacity: 0 },
    voiceHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    lastMsgBox: {
      width: "100%", marginTop: 16,
      backgroundColor: colors.background, borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    lastMsgLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, marginBottom: 4, letterSpacing: 0.5 },
    lastMsgText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 },
    messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 },
    bubble: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
    userBubble: { justifyContent: "flex-end" },
    aiBubble: { justifyContent: "flex-start" },
    avatarCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
    bubbleInner: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    userInner: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    aiInner: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    userText: { fontFamily: "Inter_400Regular", color: "#fff" },
    aiText: { fontFamily: "Inter_400Regular", color: colors.foreground },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      paddingHorizontal: 16, paddingTop: 10,
      backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
    },
    input: {
      flex: 1, maxHeight: 120,
      backgroundColor: colors.background,
      borderRadius: 22, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground,
    },
    sendBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
    },
    sendBtnDisabled: { opacity: 0.45 },
    sendBtnPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  });
}
