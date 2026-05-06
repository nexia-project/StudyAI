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
import Svg, { G, Path, Rect, Text as SvgText, Circle } from "react-native-svg";
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
  color?: string;
  subtopics: Subtopic[];
}

interface Category {
  name: string;
  topics: Topic[];
}

interface MapaMental {
  subject: string;
  color?: string;
  categories?: Category[];
  topics?: Topic[]; // legacy
}

interface TreeNode {
  id: string;
  label: string;
  depth: number;
  detail?: string;
  parentTopic?: string;
  children: TreeNode[];
  x?: number;
  y?: number;
}

// NotebookLM-style palette by depth
const MM_PALETTE = [
  { fill: "#C4C0E5", stroke: "#9893C9", text: "#312E5C", chip: "#6661A8" },
  { fill: "#B8E3D2", stroke: "#7CC4A9", text: "#1F4F3F", chip: "#3F8C6F" },
  { fill: "#C6E8F1", stroke: "#7FBED1", text: "#0E3F4D", chip: "#2D7E94" },
  { fill: "#E8F1D4", stroke: "#BDD18C", text: "#3A4A1E", chip: "#6B8434" },
];

const NODE_W = 168;
const NODE_H = 38;
const COL_GAP = 50;
const ROW_GAP = 12;

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
  const [selectedNode, setSelectedNode] = useState<{ label: string; detail?: string; parentTopic?: string; depth: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  // Build hierarchical tree from new {categories} or legacy {topics} shape
  const buildTree = (m: MapaMental): TreeNode => {
    const cats: Category[] = m.categories ?? (m.topics ? [{ name: m.subject, topics: m.topics }] : []);
    return {
      id: "root",
      label: m.subject,
      depth: 0,
      children: cats.map((cat, ci) => ({
        id: `c${ci}`,
        label: cat.name,
        depth: 1,
        children: (cat.topics ?? []).map((t, ti) => ({
          id: `c${ci}-t${ti}`,
          label: t.name,
          depth: 2,
          children: (t.subtopics ?? []).map((s, si) => {
            const isStr = typeof s === "string";
            return {
              id: `c${ci}-t${ti}-s${si}`,
              label: isStr ? (s as unknown as string) : s.name,
              detail: isStr ? undefined : s.detail,
              depth: 3,
              parentTopic: t.name,
              children: [],
            };
          }),
        })),
      })),
    };
  };

  // Tidy horizontal layout
  const layoutTree = (root: TreeNode) => {
    let yCursor = 0;
    const all: TreeNode[] = [];
    const walk = (n: TreeNode): number => {
      n.x = 28 + n.depth * (NODE_W + COL_GAP);
      const visible = collapsed.has(n.id) ? [] : n.children;
      if (visible.length === 0) {
        n.y = yCursor + NODE_H / 2;
        yCursor += NODE_H + ROW_GAP;
      } else {
        const ys = visible.map(c => walk(c));
        n.y = (ys[0] + ys[ys.length - 1]) / 2;
      }
      all.push(n);
      return n.y!;
    };
    walk(root);
    const maxDepth = Math.max(...all.map(n => n.depth));
    const W = 28 + (maxDepth + 1) * (NODE_W + COL_GAP);
    const H = Math.max(yCursor + 28, 400);
    return { all, W, H };
  };

  const toggleCollapse = (id: string) => {
    Haptics.selectionAsync();
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
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
            {(() => {
              const tree = buildTree(mapa);
              const { all, W, H } = layoutTree(tree);
              return (
                <Animated.View style={[{ width: W, height: H, position: "absolute", left: (screenW - W) / 2, top: Math.max(40, (screenH - H) / 2 - 100) }, animStyle]}>
                  <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                    {/* Edges */}
                    {all.map(parent => {
                      if (collapsed.has(parent.id)) return null;
                      return parent.children.map(child => {
                        const px = (parent.x ?? 0) + NODE_W;
                        const py = parent.y ?? 0;
                        const cx = child.x ?? 0;
                        const cy = child.y ?? 0;
                        const midX = (px + cx) / 2;
                        const palette = MM_PALETTE[child.depth] ?? MM_PALETTE[3];
                        return (
                          <Path
                            key={`e-${parent.id}-${child.id}`}
                            d={`M${px},${py} C${midX},${py} ${midX},${cy} ${cx},${cy}`}
                            fill="none"
                            stroke={palette.stroke}
                            strokeWidth={1.8}
                            strokeOpacity={0.65}
                          />
                        );
                      });
                    })}
                    {/* Nodes */}
                    {all.map(n => {
                      const palette = MM_PALETTE[n.depth] ?? MM_PALETTE[3];
                      const x = n.x ?? 0;
                      const y = (n.y ?? 0) - NODE_H / 2;
                      const hasChildren = n.children.length > 0;
                      const isCollapsed = collapsed.has(n.id);
                      const maxLen = hasChildren ? 19 : 22;
                      const label = n.label.length > maxLen ? n.label.slice(0, maxLen - 1) + "…" : n.label;
                      return (
                        <G key={n.id} x={x} y={y}>
                          <Rect
                            width={NODE_W} height={NODE_H} rx={9} ry={9}
                            fill={palette.fill} stroke={palette.stroke} strokeWidth={1.2}
                            onPress={n.depth > 0 ? () => {
                              Haptics.selectionAsync();
                              setSelectedNode({ label: n.label, detail: n.detail, parentTopic: n.parentTopic, depth: n.depth });
                            } : undefined}
                          />
                          <SvgText
                            x={hasChildren ? (NODE_W - 26) / 2 + 4 : NODE_W / 2}
                            y={NODE_H / 2 + 4}
                            fill={palette.text}
                            fontSize={n.depth === 0 ? 12 : 11}
                            fontWeight={n.depth <= 1 ? "700" : "600"}
                            textAnchor="middle"
                          >
                            {label}
                          </SvgText>
                          {hasChildren && (
                            <G x={NODE_W - 24} y={NODE_H / 2 - 9} onPress={() => toggleCollapse(n.id)}>
                              <Circle cx={9} cy={9} r={9} fill="#fff" stroke={palette.chip} strokeWidth={1.2} />
                              <SvgText x={9} y={13} textAnchor="middle" fontSize={11} fontWeight="700" fill={palette.chip}>
                                {isCollapsed ? "›" : "‹"}
                              </SvgText>
                            </G>
                          )}
                        </G>
                      );
                    })}
                  </Svg>
                </Animated.View>
              );
            })()}
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

      {/* Node detail modal */}
      <Modal visible={!!selectedNode} transparent animationType="fade" onRequestClose={() => setSelectedNode(null)}>
        <Pressable style={styles.modalBg} onPress={() => setSelectedNode(null)}>
          <Pressable style={[styles.detailCard, { backgroundColor: colors.card, borderColor: MM_PALETTE[selectedNode?.depth ?? 3]?.chip ?? colors.primary }]} onPress={e => e.stopPropagation()}>
            {selectedNode && (
              <>
                {selectedNode.parentTopic && (
                  <Text style={{ color: MM_PALETTE[selectedNode.depth].chip, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>
                    {selectedNode.parentTopic.toUpperCase()}
                  </Text>
                )}
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 }}>
                  {selectedNode.label}
                </Text>
                {selectedNode.detail ? (
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
                    {selectedNode.detail}
                  </Text>
                ) : (
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic", fontSize: 12 }}>
                    Toque no nó para expandir/colapsar e explore o mapa.
                  </Text>
                )}
                <Pressable onPress={() => setSelectedNode(null)} style={[styles.closeBtn, { backgroundColor: MM_PALETTE[selectedNode.depth].chip }]}>
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
