import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface Caderno {
  id: number;
  title: string;
  persona: string;
  goals: string;
  color: string;
  emoji: string;
  is_default: boolean;
  docs_count?: number;
}

type SourceMode = "pdf" | "text" | "url" | "youtube" | "wikipedia" | "audio" | "image" | "gdocs";

const SOURCE_OPTIONS: Array<{ id: SourceMode; label: string; icon: any; color: string }> = [
  { id: "pdf",       label: "PDF / Doc",   icon: "file-text",   color: "#6366f1" },
  { id: "text",      label: "Colar texto", icon: "edit-3",      color: "#14b8a6" },
  { id: "url",       label: "Site / URL",  icon: "link-2",      color: "#0ea5e9" },
  { id: "youtube",   label: "YouTube",     icon: "youtube",     color: "#ef4444" },
  { id: "wikipedia", label: "Wikipedia",   icon: "book-open",   color: "#475569" },
  { id: "audio",     label: "Áudio",       icon: "mic",         color: "#a855f7" },
  { id: "image",     label: "Imagem (OCR)",icon: "image",       color: "#f59e0b" },
  { id: "gdocs",     label: "Google Docs", icon: "file",        color: "#2563eb" },
];

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

interface Infografico {
  b64_json: string;
  mimeType: string;
  titulo: string;
  subtitulo: string;
  estilo: string;
}

const INFO_ESTILOS: Array<{ id: string; label: string; icon: string }> = [
  { id: "profissional", label: "Profissional",  icon: "briefcase" },
  { id: "kawaii",       label: "Kawaii",         icon: "heart" },
  { id: "cientifico",   label: "Científico",     icon: "activity" },
  { id: "anime",        label: "Anime",          icon: "zap" },
  { id: "esboco",       label: "Esboço",         icon: "edit-3" },
  { id: "minimalista",  label: "Minimalista",    icon: "circle" },
];

export default function NotebookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // ─── Cadernos (multi-notebook) ─────────────────────────────────────
  const [cadernos, setCadernos] = useState<Caderno[]>([]);
  const [activeCaderno, setActiveCaderno] = useState<Caderno | null>(null);
  const [showCadernoModal, setShowCadernoModal] = useState(false);
  const [cadernoForm, setCadernoForm] = useState({ title: "", persona: "", goals: "", emoji: "📘", color: "indigo" });

  // ─── Source picker ─────────────────────────────────────────────────
  const [sourceMode, setSourceMode] = useState<SourceMode | null>(null);
  const [srcText, setSrcText] = useState("");
  const [srcTitle, setSrcTitle] = useState("");
  const [srcUrl, setSrcUrl] = useState("");

  const [docs, setDocs] = useState<NotebookDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [openFonte, setOpenFonte] = useState<Fonte | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [restrictToSelected, setRestrictToSelected] = useState(false);

  const toggleDocSelection = (id: number) => {
    Haptics.selectionAsync();
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setRestrictToSelected(true);
  };

  // Podcast modal state
  const [podcastDoc, setPodcastDoc] = useState<NotebookDoc | null>(null);
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const speakSoundRef = useRef<Audio.Sound | null>(null);

  // Infographic modal state
  const [infoDoc, setInfoDoc] = useState<NotebookDoc | null>(null);
  const [infoEstilo, setInfoEstilo] = useState<string>("profissional");
  const [infografico, setInfografico] = useState<Infografico | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const openInfografico = (doc: NotebookDoc) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInfoDoc(doc);
    setInfografico(null);
    setInfoEstilo("profissional");
  };

  const generateInfografico = async () => {
    if (!infoDoc) return;
    setInfoLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/notebook/infografico`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: infoDoc.id, estilo: infoEstilo, orientacao: "retrato", cadernoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro");
      setInfografico(data);
    } catch (e: any) {
      Alert.alert("Não consegui gerar o infográfico", e.message);
    } finally {
      setInfoLoading(false);
    }
  };

  const loadCadernos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notebook/cadernos`, { credentials: "include" });
      if (res.ok) {
        const list: Caderno[] = await res.json();
        setCadernos(list);
        if (!activeCaderno && list.length) {
          setActiveCaderno(list.find(c => c.is_default) ?? list[0]);
        }
      }
    } catch (e) { console.warn("cadernos:", e); }
  }, [activeCaderno]);

  const loadDocs = useCallback(async () => {
    try {
      const cid = activeCaderno?.id;
      const url = cid ? `${API_BASE}/api/notebook/docs?cadernoId=${cid}` : `${API_BASE}/api/notebook/docs`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setDocs(await res.json());
    } catch (e) { console.warn("notebook docs:", e); }
    finally { setLoading(false); }
  }, [activeCaderno]);

  useEffect(() => { if (user) { loadCadernos(); } else { setLoading(false); } }, [user, loadCadernos]);
  useEffect(() => { if (user && activeCaderno) loadDocs(); }, [user, activeCaderno, loadDocs]);

  const createCaderno = async () => {
    if (!cadernoForm.title.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/notebook/cadernos`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cadernoForm),
      });
      if (res.ok) {
        const novo: Caderno = await res.json();
        setCadernos(prev => [novo, ...prev]);
        setActiveCaderno(novo);
        setShowCadernoModal(false);
        setCadernoForm({ title: "", persona: "", goals: "", emoji: "📘", color: "indigo" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const data = await res.json();
        Alert.alert("Erro", data.erro ?? "Não foi possível criar o caderno");
      }
    } catch (e: any) { Alert.alert("Erro de conexão", e.message); }
  };

  // ─── Upload helpers ──────────────────────────────────────────────────────
  const cadernoId = activeCaderno?.id;

  const finishUpload = async (data: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Pronto!", data.message ?? `"${data.title}" foi adicionado.`);
    setSourceMode(null);
    setSrcText(""); setSrcTitle(""); setSrcUrl("");
    await loadDocs();
  };

  const failUpload = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert("Erro", msg);
  };

  const uploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/markdown"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/pdf" } as any);
      if (cadernoId) form.append("cadernoId", String(cadernoId));
      const res = await fetch(`${API_BASE}/api/notebook/upload-file`, { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no upload");
      await finishUpload(data);
    } catch (e: any) { failUpload(e.message ?? "Tente novamente"); }
    finally { setUploading(false); }
  };

  const uploadAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"], copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const form = new FormData();
      form.append("audio", { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "audio/m4a" } as any);
      form.append("title", asset.name.replace(/\.[^.]+$/, ""));
      if (cadernoId) form.append("cadernoId", String(cadernoId));
      const res = await fetch(`${API_BASE}/api/notebook/upload-audio`, { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha");
      await finishUpload(data);
    } catch (e: any) { failUpload(e.message ?? "Erro ao transcrever"); }
    finally { setUploading(false); }
  };

  const uploadImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permissão", "Precisamos do acesso à galeria"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const form = new FormData();
      const name = asset.fileName || `image-${Date.now()}.jpg`;
      form.append("image", { uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" } as any);
      form.append("title", name.replace(/\.[^.]+$/, ""));
      if (cadernoId) form.append("cadernoId", String(cadernoId));
      const res = await fetch(`${API_BASE}/api/notebook/upload-image`, { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha");
      await finishUpload(data);
    } catch (e: any) { failUpload(e.message ?? "Erro ao processar imagem"); }
    finally { setUploading(false); }
  };

  const uploadJsonEndpoint = async (
    endpoint: string,
    body: Record<string, any>,
    requireField: string,
  ) => {
    if (!body[requireField]?.toString().trim()) return;
    try {
      setUploading(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${API_BASE}/api/notebook/${endpoint}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, cadernoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha");
      await finishUpload(data);
    } catch (e: any) { failUpload(e.message ?? "Erro"); }
    finally { setUploading(false); }
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
      const useScope = restrictToSelected && selectedDocIds.length > 0;
      const res = await fetch(`${API_BASE}/api/notebook/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: q, docIds: useScope ? selectedDocIds : undefined, cadernoId }),
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
        body: JSON.stringify({ docId: doc.id, cadernoId }),
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
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Caderno IA</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Cadernos personalizados, 8 tipos de fonte e Tiagão como tutor
          </Text>
        </View>

        {/* Cadernos picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, marginHorizontal: -16, paddingHorizontal: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {cadernos.map(c => {
            const isActive = activeCaderno?.id === c.id;
            return (
              <Pressable key={c.id} onPress={() => { Haptics.selectionAsync(); setActiveCaderno(c); setSelectedDocIds([]); setMessages([]); }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
                    borderWidth: 1.5,
                    backgroundColor: isActive ? colors.primary : (pressed ? `${colors.primary}10` : colors.card),
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}>
                <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                <Text style={{ color: isActive ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, maxWidth: 140 }} numberOfLines={1}>
                  {c.title}
                </Text>
                {typeof c.docs_count === "number" && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: isActive ? "#ffffff30" : `${colors.primary}15` }}>
                    <Text style={{ color: isActive ? "#fff" : colors.primary, fontSize: 10, fontFamily: "Inter_700Bold" }}>{c.docs_count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCadernoModal(true); }}
            style={({ pressed }) => [
              {
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
                borderWidth: 1.5, borderStyle: "dashed",
                backgroundColor: pressed ? `${colors.primary}10` : "transparent",
                borderColor: colors.border,
              },
            ]}>
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 12 }}>Novo</Text>
          </Pressable>
        </ScrollView>

        {/* Source grid (8 types) */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {SOURCE_OPTIONS.map(opt => (
            <Pressable key={opt.id} onPress={() => { Haptics.selectionAsync(); setSourceMode(opt.id); }} disabled={uploading}
              style={({ pressed }) => [{
                flexBasis: "23%", flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 4,
                paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: pressed ? `${opt.color}15` : colors.card,
                opacity: uploading ? 0.5 : 1,
              }]}>
              <Feather name={opt.icon} size={18} color={opt.color} />
              <Text style={{ color: colors.foreground, fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" }} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {uploading && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, padding: 10, borderRadius: 12, backgroundColor: `${colors.primary}10` }}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Processando fonte...</Text>
          </View>
        )}

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
            {docs.map(d => {
              const isSelected = selectedDocIds.includes(d.id);
              return (
              <Pressable
                key={d.id}
                onPress={() => toggleDocSelection(d.id)}
                style={({ pressed }) => [
                  styles.docCard,
                  {
                    backgroundColor: isSelected ? `${colors.primary}10` : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[
                  styles.docIcon,
                  { backgroundColor: isSelected ? colors.primary : `${colors.primary}20` },
                ]}>
                  <Feather
                    name={isSelected ? "check" : "file-text"}
                    size={18}
                    color={isSelected ? "#fff" : colors.primary}
                  />
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
                  onPress={() => openInfografico(d)}
                  style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? "#d946ef30" : "#d946ef15" }]}
                  hitSlop={6}
                >
                  <Feather name="image" size={16} color="#c026d3" />
                </Pressable>
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
              </Pressable>
              );
            })}
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

      {/* Scope bar + Composer */}
      <View style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
        paddingBottom: insets.bottom + 80,
      }}>
        {selectedDocIds.length > 0 && (
          <View style={[styles.scopeBar, { borderBottomColor: colors.border }]}>
            <Feather
              name={restrictToSelected ? "lock" : "unlock"}
              size={12}
              color={restrictToSelected ? colors.primary : colors.mutedForeground}
            />
            <Text style={{
              flex: 1,
              color: restrictToSelected ? colors.primary : colors.mutedForeground,
              fontSize: 11,
              fontFamily: "Inter_600SemiBold",
            }}>
              {restrictToSelected
                ? `Perguntando só sobre ${selectedDocIds.length} fonte${selectedDocIds.length > 1 ? "s" : ""} marcada${selectedDocIds.length > 1 ? "s" : ""}`
                : `${selectedDocIds.length} marcada${selectedDocIds.length > 1 ? "s" : ""} (ignorando filtro)`}
            </Text>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setRestrictToSelected(v => !v); }}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
              hitSlop={6}
            >
              <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_700Bold" }}>
                {restrictToSelected ? "Soltar" : "Travar"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDocIds([]); setRestrictToSelected(false); }}
              hitSlop={6}
            >
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8, padding: 12, alignItems: "flex-end" }}>
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
      </View>

      {/* Source-mode bottom sheet */}
      <Modal visible={!!sourceMode} transparent animationType="slide" onRequestClose={() => setSourceMode(null)}>
        <Pressable style={[styles.modalBg, { justifyContent: "flex-end" }]} onPress={() => setSourceMode(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]} onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {SOURCE_OPTIONS.find(o => o.id === sourceMode)?.label}
              </Text>
              <Pressable onPress={() => setSourceMode(null)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {sourceMode === "pdf" && (
              <Pressable onPress={uploadFile} disabled={uploading}
                style={({ pressed }) => [styles.uploadCard, { backgroundColor: colors.primary, opacity: pressed || uploading ? 0.7 : 1 }]}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="upload" size={20} color="#fff" />}
                <Text style={styles.uploadText}>{uploading ? "Enviando..." : "Escolher PDF / TXT / MD"}</Text>
              </Pressable>
            )}

            {sourceMode === "audio" && (
              <Pressable onPress={uploadAudio} disabled={uploading}
                style={({ pressed }) => [styles.uploadCard, { backgroundColor: "#a855f7", opacity: pressed || uploading ? 0.7 : 1 }]}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="mic" size={20} color="#fff" />}
                <Text style={styles.uploadText}>{uploading ? "Transcrevendo..." : "Escolher arquivo de áudio"}</Text>
              </Pressable>
            )}

            {sourceMode === "image" && (
              <Pressable onPress={uploadImage} disabled={uploading}
                style={({ pressed }) => [styles.uploadCard, { backgroundColor: "#f59e0b", opacity: pressed || uploading ? 0.7 : 1 }]}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="image" size={20} color="#fff" />}
                <Text style={styles.uploadText}>{uploading ? "Lendo imagem..." : "Escolher imagem (OCR)"}</Text>
              </Pressable>
            )}

            {(sourceMode === "youtube" || sourceMode === "url" || sourceMode === "gdocs") && (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={srcUrl} onChangeText={setSrcUrl}
                  placeholder={
                    sourceMode === "youtube" ? "https://youtube.com/watch?v=..." :
                    sourceMode === "gdocs"   ? "https://docs.google.com/document/d/..." :
                                               "https://exemplo.com/artigo"
                  }
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none" autoCorrect={false}
                  style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 48 }]}
                />
                <TextInput
                  value={srcTitle} onChangeText={setSrcTitle}
                  placeholder="Título (opcional)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 44 }]}
                />
                <Pressable
                  onPress={() => {
                    const ep = sourceMode === "youtube" ? "upload-youtube" : sourceMode === "gdocs" ? "upload-gdocs" : "upload-url";
                    uploadJsonEndpoint(ep, { url: srcUrl.trim(), title: srcTitle.trim() || undefined }, "url");
                  }}
                  disabled={!srcUrl.trim() || uploading}
                  style={({ pressed }) => [styles.uploadCard, { backgroundColor: !srcUrl.trim() || uploading ? colors.muted : colors.primary, opacity: pressed ? 0.7 : 1 }]}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="download-cloud" size={18} color="#fff" />}
                  <Text style={styles.uploadText}>{uploading ? "Importando..." : "Importar"}</Text>
                </Pressable>
              </View>
            )}

            {sourceMode === "wikipedia" && (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={srcTitle} onChangeText={setSrcTitle}
                  placeholder="Termo (ex: Revolução Francesa)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 48 }]}
                />
                <Pressable
                  onPress={() => uploadJsonEndpoint("upload-wikipedia", { termo: srcTitle.trim() }, "termo")}
                  disabled={!srcTitle.trim() || uploading}
                  style={({ pressed }) => [styles.uploadCard, { backgroundColor: !srcTitle.trim() || uploading ? colors.muted : "#475569", opacity: pressed ? 0.7 : 1 }]}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="book-open" size={18} color="#fff" />}
                  <Text style={styles.uploadText}>{uploading ? "Buscando..." : "Buscar Wikipedia"}</Text>
                </Pressable>
              </View>
            )}

            {sourceMode === "text" && (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={srcTitle} onChangeText={setSrcTitle}
                  placeholder="Título"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 44 }]}
                />
                <TextInput
                  value={srcText} onChangeText={setSrcText}
                  placeholder="Cole seu texto aqui..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 160, textAlignVertical: "top" }]}
                />
                <Pressable
                  onPress={() => uploadJsonEndpoint("upload-text", { title: srcTitle.trim() || "Texto colado", text: srcText.trim() }, "text")}
                  disabled={!srcText.trim() || uploading}
                  style={({ pressed }) => [styles.uploadCard, { backgroundColor: !srcText.trim() || uploading ? colors.muted : "#14b8a6", opacity: pressed ? 0.7 : 1 }]}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Feather name="check" size={18} color="#fff" />}
                  <Text style={styles.uploadText}>{uploading ? "Salvando..." : "Adicionar texto"}</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* New caderno modal */}
      <Modal visible={showCadernoModal} transparent animationType="slide" onRequestClose={() => setShowCadernoModal(false)}>
        <Pressable style={[styles.modalBg, { justifyContent: "flex-end" }]} onPress={() => setShowCadernoModal(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]} onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo caderno</Text>
              <Pressable onPress={() => setShowCadernoModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["📘","📚","🧠","⚗️","📐","🎨","🌍","💻"].map(em => (
                  <Pressable key={em} onPress={() => setCadernoForm(f => ({ ...f, emoji: em }))}
                    style={{ width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: cadernoForm.emoji === em ? colors.primary : colors.border, backgroundColor: cadernoForm.emoji === em ? `${colors.primary}15` : colors.card }}>
                    <Text style={{ fontSize: 18 }}>{em}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={cadernoForm.title} onChangeText={t => setCadernoForm(f => ({ ...f, title: t }))}
                placeholder="Nome (ex: Biologia ENEM)" placeholderTextColor={colors.mutedForeground}
                style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 48 }]} />
              <TextInput value={cadernoForm.persona} onChangeText={t => setCadernoForm(f => ({ ...f, persona: t }))}
                placeholder="Persona / quem é o aluno (opcional)" placeholderTextColor={colors.mutedForeground}
                multiline style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 70, textAlignVertical: "top" }]} />
              <TextInput value={cadernoForm.goals} onChangeText={t => setCadernoForm(f => ({ ...f, goals: t }))}
                placeholder="Objetivos / o que quer dominar (opcional)" placeholderTextColor={colors.mutedForeground}
                multiline style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, minHeight: 70, textAlignVertical: "top" }]} />
              <Pressable onPress={createCaderno} disabled={!cadernoForm.title.trim()}
                style={({ pressed }) => [styles.uploadCard, { backgroundColor: !cadernoForm.title.trim() ? colors.muted : colors.primary, opacity: pressed ? 0.7 : 1 }]}>
                <Feather name="plus-circle" size={18} color="#fff" />
                <Text style={styles.uploadText}>Criar caderno</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

      {/* Infographic modal */}
      <Modal visible={!!infoDoc} transparent animationType="slide" onRequestClose={() => { setInfoDoc(null); setInfografico(null); }}>
        <View style={[styles.modalBg, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.podcastSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#c026d3", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 }}>INFOGRÁFICO IA</Text>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }} numberOfLines={1}>
                  {infoDoc?.title}
                </Text>
              </View>
              <Pressable onPress={() => { setInfoDoc(null); setInfografico(null); }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {!infografico && !infoLoading && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 8 }}>
                  Escolha um estilo
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {INFO_ESTILOS.map(est => {
                    const selected = infoEstilo === est.id;
                    return (
                      <Pressable
                        key={est.id}
                        onPress={() => { Haptics.selectionAsync(); setInfoEstilo(est.id); }}
                        style={({ pressed }) => [
                          {
                            flexDirection: "row", alignItems: "center", gap: 6,
                            paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
                            borderWidth: 1.5,
                            backgroundColor: selected ? "#c026d3" : (pressed ? `${colors.primary}10` : colors.card),
                            borderColor: selected ? "#c026d3" : colors.border,
                          },
                        ]}
                      >
                        <Feather name={est.icon as any} size={14} color={selected ? "#fff" : colors.foreground} />
                        <Text style={{ color: selected ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                          {est.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={generateInfografico}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                      paddingVertical: 14, borderRadius: 14,
                      backgroundColor: pressed ? "#a21caf" : "#c026d3",
                    },
                  ]}
                >
                  <Feather name="zap" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                    Gerar infográfico
                  </Text>
                </Pressable>

                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 10 }}>
                  Pode levar 15-30 segundos. A IA analisa o documento e desenha um pôster visual.
                </Text>
              </ScrollView>
            )}

            {infoLoading && (
              <View style={{ alignItems: "center", paddingVertical: 60 }}>
                <ActivityIndicator color="#c026d3" size="large" />
                <Text style={{ color: colors.foreground, marginTop: 12, fontFamily: "Inter_600SemiBold" }}>
                  Desenhando seu pôster...
                </Text>
                <Text style={{ color: colors.mutedForeground, marginTop: 4, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                  Estilo: {INFO_ESTILOS.find(e => e.id === infoEstilo)?.label}
                </Text>
              </View>
            )}

            {infografico && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                    {infografico.titulo}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                    {infografico.subtitulo}
                  </Text>
                </View>
                <View style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                  {/* @ts-ignore — RN Image accepts data URLs */}
                  <Image
                    source={{ uri: `data:${infografico.mimeType};base64,${infografico.b64_json}` }}
                    style={{ width: "100%", aspectRatio: 1024 / 1536 }}
                    resizeMode="contain"
                  />
                </View>
                <Pressable
                  onPress={() => { setInfografico(null); }}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                      paddingVertical: 12, borderRadius: 12, marginTop: 12,
                      borderWidth: 1, borderColor: colors.border,
                      backgroundColor: pressed ? `${colors.primary}10` : "transparent",
                    },
                  ]}
                >
                  <Feather name="refresh-cw" size={14} color={colors.foreground} />
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    Gerar outro estilo
                  </Text>
                </Pressable>
              </ScrollView>
            )}
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
  scopeBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
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
