import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { membersData } from "../src/data";
import { getTasks, setTaskStatus, Task } from "../src/api";
import { AppIcon } from "../src/components/Icons";

export default function PlanScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch((err) => console.warn("Plan tasks load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleDone = async (task: Task) => {
    const nextStatus = task.status === "DONE" ? "IN_PROGRESS" : "DONE";
    try {
      await setTaskStatus(task.id, nextStatus);
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status");
    }
  };

  const activeTask = tasks[0] || {
    id: 1,
    title: "Healthcare Dashboard UI",
    description: "Design team directive and automated regression review",
    status: "IN_PROGRESS" as const,
    deadline: "2026-08-20T18:00:00",
    owner_id: 1,
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <AppIcon name="close" size={18} color="#1c1c1e" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/calendar")}>
              <AppIcon name="library" size={18} color="#7c69ef" />
            </TouchableOpacity>
          </View>

          {/* Time Badge */}
          <View style={styles.timePill}>
            <Text style={styles.timePillText}>Due: {activeTask.deadline ? new Date(activeTask.deadline).toLocaleDateString() : "Thursday, 6:00 PM"}</Text>
          </View>

          {/* Title Block */}
          <Text style={styles.mainTitle}>{activeTask.title}</Text>
          <Text style={styles.subtitle}>{activeTask.description || "Operational directive tracked by Caspian Sentinel."}</Text>

          {/* Members Avatars */}
          <View style={styles.membersRow}>
            <View style={styles.avatarStack}>
              {membersData.slice(0, 3).map((m, i) => (
                <Image key={m.id} source={{ uri: m.avatar }} style={[styles.avatar, { left: i * 24 }]} />
              ))}
            </View>
            <View style={styles.assignedBadge}><Text style={styles.assignedText}>Status: {activeTask.status}</Text></View>
          </View>

          {/* Plan Items */}
          <Text style={styles.planHeading}>Active Directives & Milestones</Text>
          {loading ? (
            <ActivityIndicator color="#7c69ef" style={{ marginVertical: 20 }} />
          ) : (
            tasks.map((t) => {
              const isDone = t.status === "DONE";
              return (
                <TouchableOpacity key={t.id} style={[styles.planCard, isDone && styles.planCardDone]} onPress={() => handleToggleDone(t)}>
                  <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                    {isDone && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planTitle, isDone && styles.planTitleDone]}>{t.title}</Text>
                    <Text style={styles.planSub}>Owner #{t.owner_id} · {t.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.joinBtn} onPress={() => router.push("/")}>
            <Text style={styles.joinBtnText}>Acknowledge & Sync</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#ffffff", paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 6 : 0 },
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e5ea" },
  timePill: { alignSelf: "flex-start", backgroundColor: "#f2f2f7", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 8 },
  timePillText: { fontSize: 11, fontWeight: "600", color: "#7c69ef" },
  mainTitle: { fontSize: 24, fontWeight: "800", color: "#1c1c1e", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#8e8e93", lineHeight: 18, marginBottom: 16 },
  membersRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  avatarStack: { height: 36, width: 100, position: "relative" },
  avatar: { width: 34, height: 34, borderRadius: 17, position: "absolute", borderWidth: 2, borderColor: "#ffffff" },
  assignedBadge: { backgroundColor: "rgba(124, 105, 239, 0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  assignedText: { color: "#7c69ef", fontSize: 11, fontWeight: "700" },
  planHeading: { fontSize: 15, fontWeight: "700", color: "#1c1c1e", marginBottom: 12 },
  planCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f7f8fc", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "#e5e5ea" },
  planCardDone: { backgroundColor: "#f2f9f4", borderColor: "#c3e6cb" },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#c7c7cc", alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  planTitle: { fontSize: 13, fontWeight: "600", color: "#1c1c1e" },
  planTitleDone: { textDecorationLine: "line-through", color: "#8e8e93" },
  planSub: { fontSize: 10, color: "#8e8e93", marginTop: 1 },
  footer: { position: "absolute", bottom: 20, left: 20, right: 20 },
  joinBtn: { backgroundColor: "#1c1c1e", height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  joinBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
});
