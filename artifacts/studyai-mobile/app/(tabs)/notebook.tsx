import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useColors } from "@/hooks/useColors";

interface NotebookDoc {
  id: number;
  title: string;
  source_file: string | null;
  file_size_kb: number | null;
  created_at: string;
  content_length: number;
}

interface Fonte {
  numero: number;
  titulo: string;
  trecho: string;
  trechoCompleto: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  fontes?: Fonte[];
}

interface PodcastFala {
  speaker: "ANA" | "MARCOS";
  fala: string;
}

interface Podcast {
  titulo: string;
  subtitulo: string;
  duracao: string;
  roteiro: PodcastFala[];
  destaques: string[];
}

export default function NotebookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [docs, setDocs] = useState<NotebookDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [openFonte, setOpenFonte] = useState<Fonte | null>(null);

  // Podcast modal state
  const [podcastDoc, setPodcastDoc] = useState<NotebookDoc | null>(null);
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const speakSoundRef = useRef<Audio.Sound | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notebook/docs`, { credentials: "include" });
      if (res.ok) setDocs(await res.json());
    } catch (e) { console.warn("notebook docs:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) loadDocs(); else setLoading(false); }, [user, loadDocs]);

  // ─── Upload PDF / text file ─────────────────────────────────────────────
  const uploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/markdown"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/pdf",
      } as any);

      const res = await fetch(`${API_BASE}/api/notebook/upload-file`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no upload");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Pronto!", `"${data.title ?? asset.name}" foi adicionado.`);
      await loadDocs();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro no upload", e.message ?? "Tente novamente");
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = (id: number, title: string) => {
    Alert.alert("Remover documento?", `"${title}" será excluído.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir", style: "destructive", onPress: async () => {
          await fetch(`${API_BASE}/api/notebook/docs/${id}`, { method: "DELETE", credentials: "include" });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          loadDocs();
        }
      },
    ]);
  };

  // ─── RAG chat ─────────────────────────────────────────────────────────────
  const sendQuestion = async () => {
    const q = input.trim();
    if (!q || thinking) return;
    setMessages(m => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch(`${API_BASE}/api/notebook/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: q }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data.resposta ?? data.erro ?? "Sem resposta", fontes: data.fontes ?? [] }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", text: `Erro: ${e.message}` }]);
    } finally {
      setThinking(false);
    }
  };

  // ─── Podcast generator ────────────────────────────────────────────────────
  const openPodcast = async (doc: NotebookDoc) => {
    setPodcastDoc(doc);
    setPodcast(null);
    setPodcastLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${API_BASE}/api/notebook/podcast`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro");
      setPodcast(data);
    } catch (e: any) {
      Alert.alert("Não consegui gerar o podcast", e.message);
      setPodcastDoc(null);
    } finally {
      setPodcastLoading(false);
    }
  };

  // Per-fala TTS via Tiagão TTS endpoint (web uses this too)
  const playFala = async (idx: number, fala: PodcastFala) => {
    try {
      if (playingIdx === idx) {
        await speakSoundRef.current?.stopAsync();
        setPlayingIdx(null);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (speakSoundRef.current) {
        await speakSoundRef.current.unloadAsync().catch(() => {});
        speakSoundRef.current = null;
      }
      setPlayingIdx(idx);
      const res = await fetch(`${API_BASE}/api/tiagao/tts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fala.fala, voice: fala.speaker === "ANA" ? "nova" : "onyx" }),
      });
      if (!res.ok) throw new Error("TTS indisponível");
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const uri = `data:audio/mpeg;base64,${base64}`;
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        speakSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(s => {
          if (s.isLoaded && s.didJustFinish) setPlayingIdx(null);
        });
      };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      setPlayingIdx(null);
      Alert.alert("Reprodução indisponível", e.message);
    }
  };

  useEffect(() => () => { speakSoundRef.current?.unloadAsync().catch(() => {}); }, []);

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_500Medium" }}>
          Faça login para usar o Caderno IA
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 200, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Caderno IA</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Suba PDFs, pergunte e gere podcast educativo
          </Text>
        </View>

        {/* Upload button */}
        <Pressable
          onPress={uploadFile}
          disabled={uploading}
          style={({ pressed }) => [
            styles.uploadCard,
            { backgroundColor: colors.primary, opacity: pressed || uploading ? 0.7 : 1 },
          ]}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="upload" size={20} color="#fff" />}
          <Text style={styles.uploadText}>
            {uploading ? "Enviando..." : "Adicionar PDF ou texto"}
          </Text>
        </Pressable>

        {/* Doc list */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>
          Suas fontes ({docs.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : docs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={28} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 8, fontFamily: "Inter_500Medium" }}>
              Nenhum documento ainda
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {docs.map(d => (
              <View
                key={d.id}
                style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.docIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Feather name="file-text" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {d.title || d.source_file || `Doc #${d.id}`}
                  </Text>
                  <Text style={[styles.docMeta, { color: colors.mutedForeground }]}>
                    {Math.round(d.content_length / 1000)}k caracteres
                    {d.file_size_kb ? ` • ${d.file_size_kb} KB` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openPodcast(d)}
                  style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? `${colors.primary}30` : `${colors.primary}15` }]}
                  hitSlop={6}
                >
                  <Feather name="headphones" size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => deleteDoc(d.id, d.title || `Doc #${d.id}`)}
                  style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? "#ef444430" : "transparent" }]}
                  hitSlop={6}
                >
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Chat history */}
        {messages.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
              Conversa com as fontes
            </Text>
            <View style={{ gap: 8 }}>
              {messages.map((m, i) => (
                <View key={i} style={[
                  styles.msg,
                  { backgroundColor: m.role === "user" ? colors.primary : colors.card,
                    borderColor: colors.border, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }
                ]}>
                  <Text style={{ color: m.role === "user" ? "#fff" : colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
                    {m.text}
                  </Text>
                  {m.fontes && m.fontes.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {m.fontes.map(f => (
                        <Pressable
                          key={f.numero}
                          onPress={() => setOpenFonte(f)}
                          style={({ pressed }) => [
                            styles.fonteChip,
                            { backgroundColor: pressed ? `${colors.primary}30` : `${colors.primary}15`, borderColor: `${colors.primary}40` }
                          ]}
                        >
                          <Feather name="bookmark" size={10} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                            Fonte {f.numero}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {thinking && (
                <View style={[styles.msg, { backgroundColor: colors.card, borderColor: colors.border, alignSelf: "flex-start" }]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Composer */}
      <View style={[
        styles.composer,
        { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 80 },
      ]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={docs.length ? "Pergunte sobre as suas fontes…" : "Adicione um documento primeiro"}
          placeholderTextColor={colors.mutedForeground}
          editable={docs.length > 0}
          multiline
          style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          onSubmitEditing={sendQuestion}
        />
        <Pressable
          onPress={sendQuestion}
          disabled={!input.trim() || thinking || docs.length === 0}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: !input.trim() || thinking || docs.length === 0 ? colors.muted : colors.primary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="send" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Fonte modal */}
      <Modal visible={!!openFonte} transparent animationType="slide" onRequestClose={() => setOpenFonte(null)}>
        <Pressable style={styles.modalBg} onPress={() => setOpenFonte(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            {openFonte && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Fonte {openFonte.numero}</Text>
                  <Pressable onPress={() => setOpenFonte(null)}>
                    <Feather name="x" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>
                  {openFonte.titulo}
                </Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  <Text style={{ color: colors.foreground, lineHeight: 22, fontFamily: "Inter_400Regular" }}>
                    {openFonte.trechoCompleto}
                  </Text>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Podcast modal */}
      <Modal visible={!!podcastDoc} transparent animationType="slide" onRequestClose={() => { setPodcastDoc(null); setPodcast(null); }}>
        <View style={[styles.modalBg, { justifyContent: "flex-end" }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, maxHeight: "92%", paddingBottom: insets.bottom + 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 }}>
                  PODCAST EDUCATIVO
                </Text>
                <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {podcastDoc?.title}
                </Text>
              </View>
              <Pressable onPress={() => { setPodcastDoc(null); setPodcast(null); speakSoundRef.current?.stopAsync().catch(()=>{}); setPlayingIdx(null); }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {podcastLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_500Medium" }}>
                  Gerando roteiro com Ana e Marcos…
                </Text>
              </View>
            ) : podcast ? (
              <ScrollView>
                <View style={[styles.podcastHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{podcast.titulo}</Text>
                  <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                    {podcast.subtitulo} • {podcast.duracao}
                  </Text>
                  {podcast.destaques?.length > 0 && (
                    <View style={{ marginTop: 10, gap: 4 }}>
                      {podcast.destaques.map((d, i) => (
                        <Text key={i} style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                          ★ {d}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{ gap: 8 }}>
                  {podcast.roteiro.map((f, i) => {
                    const isAna = f.speaker === "ANA";
                    return (
                      <View key={i} style={[
                        styles.falaCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isAna ? { borderLeftWidth: 3, borderLeftColor: "#ec4899" } : { borderLeftWidth: 3, borderLeftColor: "#3b82f6" }
                      ]}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <Text style={{ color: isAna ? "#ec4899" : "#3b82f6", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 }}>
                            {f.speaker}
                          </Text>
                          <Pressable onPress={() => playFala(i, f)} hitSlop={8}>
                            <Feather name={playingIdx === i ? "pause-circle" : "play-circle"} size={22} color={isAna ? "#ec4899" : "#3b82f6"} />
                          </Pressable>
                        </View>
                        <Text style={{ color: colors.foreground, lineHeight: 22, fontFamily: "Inter_400Regular" }}>
                          {f.fala}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  uploadCard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16 },
  uploadText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  emptyCard: { padding: 24, borderWidth: 1, borderRadius: 16, alignItems: "center" },
  docCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderRadius: 14 },
  docIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  docMeta: { fontSize: 11, marginTop: 1, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  msg: { padding: 12, borderWidth: 1, borderRadius: 14 },
  fonteChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  composer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, alignItems: "flex-end",
  },
  composerInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1,
    maxHeight: 100, fontFamily: "Inter_400Regular", fontSize: 14,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  podcastHeader: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  falaCard: { padding: 12, borderRadius: 12, borderWidth: 1 },
});
