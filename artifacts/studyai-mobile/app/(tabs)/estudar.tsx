import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
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

type Mode = "hub" | "pomodoro" | "simulado" | "flashcards";

// ---------- POMODORO ----------
function PomodoroView({ onBack, colors }: { onBack: () => void; colors: any }) {
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            setRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const next = phase === "work" ? "break" : "work";
            setPhase(next);
            setSeconds(next === "work" ? 25 * 60 : 5 * 60);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, phase]);

  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  const total = phase === "work" ? 25 * 60 : 5 * 60;
  const progress = 1 - seconds / total;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 32 }}>
      <View style={[pomStyles.ring, { borderColor: phase === "work" ? colors.primary : colors.success }]}>
        <Text style={[pomStyles.time, { color: colors.foreground }]}>{m}:{s}</Text>
        <Text style={[pomStyles.phase, { color: colors.mutedForeground }]}>
          {phase === "work" ? "Foco 🎯" : "Pausa ☕"}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Pressable
          style={[pomStyles.btn, { backgroundColor: running ? "#ef4444" : colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setRunning(!running); }}
        >
          <Feather name={running ? "pause" : "play"} size={22} color="#fff" />
        </Pressable>
        <Pressable
          style={[pomStyles.btn, { backgroundColor: colors.muted }]}
          onPress={() => { setRunning(false); setSeconds(25 * 60); setPhase("work"); }}
        >
          <Feather name="refresh-cw" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <Pressable onPress={onBack}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>← Voltar</Text>
      </Pressable>
    </View>
  );
}

const pomStyles = StyleSheet.create({
  ring: { width: 200, height: 200, borderRadius: 100, borderWidth: 10, alignItems: "center", justifyContent: "center", gap: 8 },
  time: { fontSize: 48, fontFamily: "Inter_700Bold", lineHeight: 52 },
  phase: { fontSize: 16, fontFamily: "Inter_500Medium" },
  btn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
});

// ---------- SIMULADO ----------
interface SimQuestion { question: string; alternatives: string[]; correct: number; explanation: string; }

function SimuladoView({ onBack, token, colors, profile }: { onBack: () => void; token: string | null; colors: any; profile: any }) {
  const [subject, setSubject] = useState("Matemática");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<SimQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const SUBJECTS = ["Matemática", "Português", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"];

  async function startSimulado() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/simulado/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, count: 5, grade: profile.serie || "Ensino Médio", goal: profile.objetivo || "enem" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setFinished(false);
    } catch {
      Alert.alert("Erro", "Não foi possível gerar o simulado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(idx: number) {
    if (answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[current].correct) setScore(s => s + 1);
  }

  function next() {
    if (current + 1 >= questions.length) { setFinished(true); return; }
    setCurrent(c => c + 1);
    setSelected(null);
    setAnswered(false);
  }

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 32 }}>🧠</Text>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground }}>Gerando simulado...</Text>
    </View>
  );

  if (questions.length === 0) return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={[simStyles.title, { color: colors.foreground }]}>Simulado Adaptativo</Text>
      <Text style={{ fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 16 }}>Escolha a matéria:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SUBJECTS.map(s => (
            <Pressable key={s} style={[simStyles.subjectPill, { backgroundColor: subject === s ? colors.primary : colors.muted, borderColor: subject === s ? colors.primary : colors.border }]} onPress={() => setSubject(s)}>
              <Text style={[simStyles.subjectText, { color: subject === s ? "#fff" : colors.foreground }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Pressable style={[simStyles.startBtn, { backgroundColor: colors.primary }]} onPress={startSimulado}>
        <Feather name="zap" size={20} color="#fff" />
        <Text style={simStyles.startBtnText}>Começar simulado</Text>
      </Pressable>
      <Pressable onPress={onBack} style={{ marginTop: 16, alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>← Voltar</Text>
      </Pressable>
    </ScrollView>
  );

  if (finished) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 28 }}>
      <Text style={{ fontSize: 56 }}>{score === questions.length ? "🏆" : score >= questions.length / 2 ? "⭐" : "📚"}</Text>
      <Text style={[simStyles.title, { color: colors.foreground, textAlign: "center" }]}>Resultado</Text>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 48, color: colors.primary }}>{score}/{questions.length}</Text>
      <Text style={{ fontFamily: "Inter_500Medium", color: colors.mutedForeground, textAlign: "center" }}>
        {score === questions.length ? "Perfeito! Mandou bem demais! 🔥" :
         score >= questions.length / 2 ? "Bom resultado! Continue assim!" : "Vamos revisar esse conteúdo! 💪"}
      </Text>
      <Pressable style={[simStyles.startBtn, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={startSimulado}>
        <Text style={simStyles.startBtnText}>Novo simulado</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>← Voltar ao hub</Text>
      </Pressable>
    </View>
  );

  const q = questions[current];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 12 }}>{subject} · {current + 1}/{questions.length}</Text>
      <View style={[simStyles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[simStyles.questionText, { color: colors.foreground }]}>{q.question}</Text>
      </View>
      <View style={{ gap: 10, marginBottom: 20 }}>
        {q.alternatives.map((alt, i) => {
          const isCorrect = i === q.correct;
          const isSelected = i === selected;
          let bg = colors.card;
          let border = colors.border;
          let textColor = colors.foreground;
          if (answered) {
            if (isCorrect) { bg = "#d1fae5"; border = "#10b981"; textColor = "#065f46"; }
            else if (isSelected) { bg = "#fee2e2"; border = "#ef4444"; textColor = "#991b1b"; }
          } else if (isSelected) { bg = colors.secondary; border = colors.primary; }
          return (
            <Pressable key={i} style={[simStyles.altBtn, { backgroundColor: bg, borderColor: border }]} onPress={() => handleSelect(i)}>
              <Text style={[simStyles.altLetter, { color: border }]}>{String.fromCharCode(65 + i)}</Text>
              <Text style={[simStyles.altText, { color: textColor, flex: 1 }]}>{alt}</Text>
              {answered && isCorrect && <Feather name="check-circle" size={18} color="#10b981" />}
              {answered && isSelected && !isCorrect && <Feather name="x-circle" size={18} color="#ef4444" />}
            </Pressable>
          );
        })}
      </View>
      {answered && (
        <View style={[simStyles.explanationBox, { backgroundColor: "#f0fdf4", borderColor: "#10b981" }]}>
          <Text style={{ fontFamily: "Inter_700Bold", color: "#065f46", marginBottom: 4 }}>💡 Explicação</Text>
          <Text style={{ fontFamily: "Inter_400Regular", color: "#064e3b", lineHeight: 20 }}>{q.explanation}</Text>
        </View>
      )}
      {answered && (
        <Pressable style={[simStyles.startBtn, { backgroundColor: colors.primary }]} onPress={next}>
          <Text style={simStyles.startBtnText}>{current + 1 >= questions.length ? "Ver resultado" : "Próxima questão"}</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      )}
    </ScrollView>
  );
}

const simStyles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subjectPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  subjectText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
  startBtnText: { fontFamily: "Inter_700Bold", color: "#fff", fontSize: 16 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 18 },
  questionText: { fontFamily: "Inter_500Medium", fontSize: 15, lineHeight: 24 },
  altBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14 },
  altLetter: { fontFamily: "Inter_700Bold", fontSize: 14, width: 22 },
  altText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  explanationBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
});

// ---------- FLASHCARDS ----------
function FlashcardsView({ onBack, token, colors, profile }: { onBack: () => void; token: string | null; colors: any; profile: any }) {
  const [subject, setSubject] = useState("Matemática");
  const [cards, setCards] = useState<{ front: string; back: string }[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);

  async function generateCards() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/flashcards/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, count: 8, grade: profile.serie || "" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCards(data.cards ?? []);
      setCurrent(0); setFlipped(false); setKnown(0); setFinished(false);
    } catch {
      Alert.alert("Erro", "Não foi possível gerar os flashcards. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleKnow(knew: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (knew) setKnown(k => k + 1);
    if (current + 1 >= cards.length) { setFinished(true); return; }
    setCurrent(c => c + 1);
    setFlipped(false);
  }

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 40 }}>🃏</Text>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground }}>Gerando flashcards...</Text>
    </View>
  );

  if (cards.length === 0) return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
      <Text style={[simStyles.title, { color: colors.foreground }]}>Flashcards</Text>
      <Text style={{ fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 16 }}>Escolha a matéria:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["Matemática", "Português", "História", "Física", "Química", "Biologia"].map(s => (
            <Pressable key={s} style={[simStyles.subjectPill, { backgroundColor: subject === s ? colors.primary : colors.muted, borderColor: subject === s ? colors.primary : colors.border }]} onPress={() => setSubject(s)}>
              <Text style={[simStyles.subjectText, { color: subject === s ? "#fff" : colors.foreground }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Pressable style={[simStyles.startBtn, { backgroundColor: "#10b981" }]} onPress={generateCards}>
        <Feather name="layers" size={20} color="#fff" />
        <Text style={simStyles.startBtnText}>Gerar flashcards</Text>
      </Pressable>
      <Pressable onPress={onBack} style={{ marginTop: 16, alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>← Voltar</Text>
      </Pressable>
    </ScrollView>
  );

  if (finished) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 28 }}>
      <Text style={{ fontSize: 56 }}>🎉</Text>
      <Text style={[simStyles.title, { color: colors.foreground, textAlign: "center" }]}>Sessão concluída!</Text>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 36, color: "#10b981" }}>{known}/{cards.length} acertadas</Text>
      <Pressable style={[simStyles.startBtn, { backgroundColor: "#10b981", marginTop: 8, paddingHorizontal: 24 }]} onPress={generateCards}>
        <Text style={simStyles.startBtnText}>Novo deck</Text>
      </Pressable>
      <Pressable onPress={onBack}><Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>← Voltar</Text></Pressable>
    </View>
  );

  const card = cards[current];

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 20, textAlign: "center" }}>
        {current + 1}/{cards.length} · {known} já sabe
      </Text>
      <Pressable
        style={[flashStyles.card, { backgroundColor: flipped ? colors.primary : colors.card, borderColor: flipped ? colors.primary : colors.border }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFlipped(f => !f); }}
      >
        <Text style={[flashStyles.cardLabel, { color: flipped ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
          {flipped ? "RESPOSTA" : "PERGUNTA"}
        </Text>
        <Text style={[flashStyles.cardText, { color: flipped ? "#fff" : colors.foreground }]}>
          {flipped ? card.back : card.front}
        </Text>
        {!flipped && <Text style={{ fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontSize: 13, marginTop: 16 }}>Toque para revelar</Text>}
      </Pressable>
      {flipped && (
        <View style={{ flexDirection: "row", gap: 14, marginTop: 20 }}>
          <Pressable style={[flashStyles.answerBtn, { backgroundColor: "#fee2e2", borderColor: "#ef4444", flex: 1 }]} onPress={() => handleKnow(false)}>
            <Feather name="x" size={24} color="#ef4444" />
            <Text style={[flashStyles.answerText, { color: "#ef4444" }]}>Não sei</Text>
          </Pressable>
          <Pressable style={[flashStyles.answerBtn, { backgroundColor: "#d1fae5", borderColor: "#10b981", flex: 1 }]} onPress={() => handleKnow(true)}>
            <Feather name="check" size={24} color="#10b981" />
            <Text style={[flashStyles.answerText, { color: "#10b981" }]}>Sei!</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const flashStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
    maxHeight: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardLabel: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  cardText: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 28 },
  answerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, borderWidth: 1.5, paddingVertical: 16 },
  answerText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});

// ---------- HUB ----------
export default function EstudarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { profile } = useProfile();
  const [mode, setMode] = useState<Mode>("hub");
  const isWeb = Platform.OS === "web";

  if (mode === "pomodoro") return <PomodoroView onBack={() => setMode("hub")} colors={colors} />;
  if (mode === "simulado") return <SimuladoView onBack={() => setMode("hub")} token={token} colors={colors} profile={profile} />;
  if (mode === "flashcards") return <FlashcardsView onBack={() => setMode("hub")} token={token} colors={colors} profile={profile} />;

  const styles = makeHubStyles(colors, insets, isWeb);

  const modules = [
    { key: "simulado" as Mode, icon: "target", label: "Simulado", desc: "Questões adaptativas com IA", color: "#ec4899", bg: "#fdf2f8" },
    { key: "flashcards" as Mode, icon: "layers", label: "Flashcards", desc: "Memorização ativa", color: "#10b981", bg: "#f0fdf4" },
    { key: "pomodoro" as Mode, icon: "clock", label: "Pomodoro", desc: "Timer foco 25min", color: "#f59e0b", bg: "#fffbeb" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Estudar</Text>
      <Text style={styles.subtitle}>Escolha uma atividade</Text>

      {modules.map((m) => (
        <Pressable
          key={m.key}
          style={({ pressed }) => [styles.card, { borderColor: m.color + "30" }, pressed && styles.cardPressed]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode(m.key); }}
        >
          <View style={[styles.moduleIcon, { backgroundColor: m.bg }]}>
            <Feather name={m.icon as any} size={28} color={m.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.moduleLabel, { color: colors.foreground }]}>{m.label}</Text>
            <Text style={[styles.moduleDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function makeHubStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: isWeb ? 67 + 20 : insets.top + 20,
      paddingBottom: isWeb ? 34 + 100 : insets.bottom + 100,
      paddingHorizontal: 20,
    },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
    subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 28 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      padding: 20,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    moduleIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    moduleLabel: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
    moduleDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  });
}
