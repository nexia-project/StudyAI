import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { API_BASE, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface NotebookDoc {
  id: number;
  title: string;
}

interface Subtopic {
  name: string;
  detail?: string;
}

interface Topic {
  name: string;
  color: string;
  subtopics: Subtopic[];
}

interface MapaMental {
  subject: string;
  color: string;
  topics: Topic[];
}

const MAP_W = 1400;
const MAP_H = 1000;
const CENTER_X = MAP_W / 2;
const CENTER_Y = MAP_H / 2;

export default function MapaMentalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [docs, setDocs] = useState<NotebookDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<NotebookDoc | null>(null);
  const [mapa, setMapa] = useState<MapaMental | null>(null);
  const [loadingMapa, setLoadingMapa] = useState(false);
  const [selectedSub, setSelectedSub] = useState<{ topic: Topic; sub: Subtopic } | null>(null);

  // Pan + zoom shared values
  const scale = useSharedValue(0.6);
  const savedScale = useSharedValue(0.6);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notebook/docs`, { credentials: "include" });
      if (res.ok) setDocs(await res.json());
    } catch {}
    finally { setLoadingDocs(false); }
  }, []);

  useEffect(() => { if (user) loadDocs(); else setLoadingDocs(false); }, [user, loadDocs]);

  const loadMapa = async (doc: NotebookDoc) => {
    setActiveDoc(doc);
    setMapa(null);
    setPickerOpen(false);
    setLoadingMapa(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/notebook/mapa-mental`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro");
      // Backward-compat: backend may return {categories} (new) — flatten to {topics}
      if (data.categories && !data.topics) {
        const palette = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#06B6D4", "#8B5CF6", "#EF4444", "#14B8A6"];
        let i = 0;
        data.topics = data.categories.flatMap((cat: any) =>
          (cat.topics ?? []).map((t: any) => ({
            name: t.name,
            color: palette[i++ % palette.length],
            subtopics: (t.subtopics ?? []).map((s: any) =>
              typeof s === "string" ? { name: s } : { name: s.name, detail: s.detail }
            ),
          }))
        );
        if (!data.color) data.color = palette[0];
      }
      setMapa(data);
      // Reset view
      scale.value = withSpring(0.55);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      savedScale.value = 0.55;
      savedTx.value = 0;
      savedTy.value = 0;
    } catch (e: any) {
      Alert.alert("Não consegui gerar o mapa", e.message);
      setActiveDoc(null);
    } finally {
      setLoadingMapa(false);
    }
  };

  // Gestures
  const pinch = Gesture.Pinch()
    .onUpdate(e => { scale.value = Math.max(0.2, Math.min(3, savedScale.value * e.scale)); })
    .onEnd(() => { savedScale.value = scale.value; });
  const pan = Gesture.Pan()
    .onUpdate(e => { tx.value = savedTx.value + e.translationX; ty.value = savedTy.value + e.translationY; })
    .onEnd(() => { savedTx.value = tx.value; savedTy.value = ty.value; });
  const composed = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const resetView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.55);
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    savedScale.value = 0.55;
    savedTx.value = 0;
    savedTy.value = 0;
  };

  // Layout topics radially
  const layoutNodes = (m: MapaMental) => {
    const tCount = m.topics.length;
    const tRadius = 280;
    return m.topics.map((topic, i) => {
      const angle = (i / tCount) * Math.PI * 2 - Math.PI / 2;
      const tx = CENTER_X + Math.cos(angle) * tRadius;
      const ty = CENTER_Y + Math.sin(angle) * tRadius;
      const subs = topic.subtopics.map((sub, j) => {
        const sCount = topic.subtopics.length;
        const sAngle = angle + ((j - (sCount - 1) / 2) * 0.4);
        const sRadius = 170;
        return {
          ...sub,
          x: tx + Math.cos(sAngle) * sRadius,
          y: ty + Math.sin(sAngle) * sRadius,
        };
      });
      return { topic, x: tx, y: ty, subs };
    });
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_500Medium" }}>
          Faça login para ver os mapas mentais
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Mapa Mental</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {activeDoc ? activeDoc.title : "Escolha uma fonte para visualizar"}
            </Text>
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.docBtn,
              { backgroundColor: pressed ? `${colors.primary}30` : `${colors.primary}15`, borderColor: `${colors.primary}40` },
            ]}
          >
            <Feather name="file-text" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              {activeDoc ? "Trocar" : "Escolher"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Canvas */}
      {loadingMapa ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_500Medium" }}>
            Gerando mapa mental do documento…
          </Text>
        </View>
      ) : !mapa ? (
        <View style={styles.centerFlex}>
          <Feather name="git-branch" size={56} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, marginTop: 16, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            Mapas mentais à vista
          </Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 4, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 }}>
            Toque em "Escolher" para gerar um mapa visual a partir de uma fonte do Caderno IA.
          </Text>
        </View>
      ) : (
        <GestureDetector gesture={composed}>
          <View style={{ flex: 1, overflow: "hidden" }}>
            <Animated.View style={[{ width: MAP_W, height: MAP_H, position: "absolute", left: (screenW - MAP_W) / 2, top: (screenH - MAP_H) / 2 - 100 }, animStyle]}>
              <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
                {/* Edges first */}
                {layoutNodes(mapa).map((n, i) => (
                  <G key={`e-${i}`}>
                    <Line x1={CENTER_X} y1={CENTER_Y} x2={n.x} y2={n.y} stroke={n.topic.color} strokeWidth={3} opacity={0.6} />
                    {n.subs.map((s, j) => (
                      <Line key={j} x1={n.x} y1={n.y} x2={s.x} y2={s.y} stroke={n.topic.color} strokeWidth={1.5} opacity={0.4} />
                    ))}
                  </G>
                ))}
                {/* Center node */}
                <Circle cx={CENTER_X} cy={CENTER_Y} r={80} fill={mapa.color ?? "#6366f1"} />
                <SvgText
                  x={CENTER_X} y={CENTER_Y + 6} fill="#fff" fontSize={20} fontWeight="bold" textAnchor="middle"
                >
                  {mapa.subject.length > 18 ? mapa.subject.slice(0, 16) + "…" : mapa.subject}
                </SvgText>
                {/* Topic + subtopic nodes */}
                {layoutNodes(mapa).map((n, i) => (
                  <G key={`n-${i}`}>
                    <Rect
                      x={n.x - 90} y={n.y - 26} width={180} height={52} rx={14} ry={14}
                      fill={n.topic.color}
                    />
                    <SvgText
                      x={n.x} y={n.y + 5} fill="#fff" fontSize={15} fontWeight="bold" textAnchor="middle"
                    >
                      {n.topic.name.length > 22 ? n.topic.name.slice(0, 20) + "…" : n.topic.name}
                    </SvgText>
                    {n.subs.map((s, j) => (
                      <G key={j} onPress={() => { Haptics.selectionAsync(); setSelectedSub({ topic: n.topic, sub: s }); }}>
                        <Rect
                          x={s.x - 65} y={s.y - 18} width={130} height={36} rx={10} ry={10}
                          fill="#fff" stroke={n.topic.color} strokeWidth={1.5}
                        />
                        <SvgText
                          x={s.x} y={s.y + 4} fill={n.topic.color} fontSize={11} fontWeight="600" textAnchor="middle"
                        >
                          {s.name.length > 18 ? s.name.slice(0, 16) + "…" : s.name}
                        </SvgText>
                      </G>
                    ))}
                  </G>
                ))}
              </Svg>
            </Animated.View>
          </View>
        </GestureDetector>
      )}

      {/* Floating controls */}
      {mapa && (
        <View style={[styles.controls, { bottom: insets.bottom + 90, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={resetView} hitSlop={8} style={{ padding: 6 }}>
            <Feather name="maximize" size={16} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" }}>
            arraste e pince
          </Text>
        </View>
      )}

      {/* Doc picker modal */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]} onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Escolha uma fonte</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {loadingDocs ? (
              <ActivityIndicator color={colors.primary} />
            ) : docs.length === 0 ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, marginTop: 8, fontFamily: "Inter_500Medium" }}>
                  Nenhuma fonte ainda. Adicione no Caderno IA.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={{ gap: 6 }}>
                  {docs.map(d => (
                    <Pressable
                      key={d.id}
                      onPress={() => loadMapa(d)}
                      style={({ pressed }) => [
                        styles.docPickItem,
                        { backgroundColor: pressed ? `${colors.primary}20` : colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Feather name="file-text" size={16} color={colors.primary} />
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1 }} numberOfLines={1}>
                        {d.title}
                      </Text>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Subtopic detail modal */}
      <Modal visible={!!selectedSub} transparent animationType="fade" onRequestClose={() => setSelectedSub(null)}>
        <Pressable style={styles.modalBg} onPress={() => setSelectedSub(null)}>
          <Pressable style={[styles.detailCard, { backgroundColor: colors.card, borderColor: selectedSub?.topic.color ?? colors.primary }]} onPress={e => e.stopPropagation()}>
            {selectedSub && (
              <>
                <Text style={{ color: selectedSub.topic.color, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>
                  {selectedSub.topic.name.toUpperCase()}
                </Text>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 }}>
                  {selectedSub.sub.name}
                </Text>
                {selectedSub.sub.detail && (
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
                    {selectedSub.sub.detail}
                  </Text>
                )}
                <Pressable onPress={() => setSelectedSub(null)} style={[styles.closeBtn, { backgroundColor: selectedSub.topic.color }]}>
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Fechar</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerFlex: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  docBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  controls: {
    position: "absolute", right: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1,
  },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  docPickItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  detailCard: {
    margin: "auto", marginHorizontal: 24, padding: 20, borderRadius: 20, borderWidth: 2,
    alignSelf: "center",
  },
  closeBtn: { marginTop: 16, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
});
