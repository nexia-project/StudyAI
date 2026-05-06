import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface Slide {
  title:   string;
  content: string[];
}

interface SlideCardProps {
  slides: Slide[];
}

const { width } = Dimensions.get("window");

export default function SlideCard({ slides }: SlideCardProps) {
  const [current, setCurrent]   = useState(0);
  const [fullscreen, setFull]   = useState(false);

  if (!slides.length) return null;

  const slide = slides[current];

  const CardContent = ({ compact = true }: { compact?: boolean }) => (
    <View style={[styles.card, !compact && styles.cardFull]}>
      <Text style={[styles.counter, !compact && styles.counterFull]}>
        Slide {current + 1} / {slides.length}
      </Text>
      <Text style={[styles.title, !compact && styles.titleFull]}>{slide.title}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {slide.content.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={[styles.bulletText, !compact && styles.bulletTextFull]}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const Controls = ({ light = false }: { light?: boolean }) => (
    <View style={styles.controls}>
      <TouchableOpacity
        onPress={() => setCurrent(i => Math.max(0, i - 1))}
        disabled={current === 0}
        style={[styles.navBtn, light && styles.navBtnLight, current === 0 && styles.navBtnDisabled]}
      >
        <Ionicons name="chevron-back" size={20} color={light ? "#fff" : "#4f46e5"} />
      </TouchableOpacity>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setCurrent(i)}>
            <View style={[
              styles.dot,
              light && styles.dotLight,
              i === current && (light ? styles.dotActiveLt : styles.dotActive),
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => setCurrent(i => Math.min(slides.length - 1, i + 1))}
        disabled={current === slides.length - 1}
        style={[styles.navBtn, light && styles.navBtnLight, current === slides.length - 1 && styles.navBtnDisabled]}
      >
        <Ionicons name="chevron-forward" size={20} color={light ? "#fff" : "#4f46e5"} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      <View>
        <CardContent />
        <TouchableOpacity style={styles.expandBtn} onPress={() => setFull(true)}>
          <Ionicons name="expand-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      <Controls />

      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <SafeAreaView style={styles.modal}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setFull(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.fullContent}>
            <CardContent compact={false} />
          </View>
          <Controls light />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#4f46e5",
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
  },
  cardFull: {
    flex: 1,
    padding: 32,
    borderRadius: 20,
  },
  counter: {
    fontSize: 11,
    color: "#a5b4fc",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  counterFull: { fontSize: 13, marginBottom: 16 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 14,
    lineHeight: 24,
  },
  titleFull: { fontSize: 26, lineHeight: 34, marginBottom: 20 },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#a5b4fc",
    marginTop: 7,
  },
  bulletText: { flex: 1, color: "#e0e7ff", fontSize: 13, lineHeight: 20 },
  bulletTextFull: { fontSize: 16, lineHeight: 24 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  navBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  navBtnLight: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  navBtnDisabled: { opacity: 0.3 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  dotLight: { backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 16, backgroundColor: "#4f46e5" },
  dotActiveLt: { width: 16, backgroundColor: "#fff" },
  expandBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  modal: {
    flex: 1,
    backgroundColor: "#1e1b4b",
    padding: 20,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  fullContent: { flex: 1, marginVertical: 16 },
});
