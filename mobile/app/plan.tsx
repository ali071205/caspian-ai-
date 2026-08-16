import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../src/theme";
import { membersData } from "../src/data";
import { getTasks, setTaskStatus, Task } from "../src/api";

export default function PlanScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks()
      .then((t) => setTasks(t))
      .catch((err) => console.warn("Plan tasks load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleDone = async (task: Task) => {
    const nextStatus = task.status === "DONE" ? "IN_PROGRESS" : "DONE";
    try {
      await setTaskStatus(task.id, nextStatus);
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, status: nextStatus } : item
        )
      );
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
    at_risk: false,
    owner_id: 1,
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconBtnRound}
              onPress={() => router.back()}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconBtnRound}
              onPress={() => router.push("/calendar")}
            >
              <Text style={styles.editIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* Time Badge */}
          <View style={styles.timeBadgeRow}>
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>Due: {activeTask.deadline ? new Date(activeTask.deadline).toLocaleDateString() : "Thursday, 6:00 PM"}</Text>
            </View>
          </View>

          {/* Title Block */}
          <View style={styles.titleBlock}>
            <Text style={styles.mainTitle}>{activeTask.title}</Text>
            <Text style={styles.subtitle}>{activeTask.description || "Operational directive tracked by Caspian Sentinel."}</Text>
          </View>

          {/* Members Overlap Avatars */}
          <View style={styles.membersRow}>
            <View style={styles.avatarStack}>
              {membersData.slice(0, 3).map((m, idx) => (
                <Image
                  key={m.id}
                  source={{ uri: m.avatar }}
                  style={[styles.stackAvatar, { left: idx * 26 }]}
                />
              ))}
            </View>
            <View style={styles.assignedBadge}>
              <Text style={styles.assignedText}>Status: {activeTask.status}</Text>
            </View>
          </View>

          {/* Plan Section */}
          <View style={styles.planSection}>
            <Text style={styles.planHeading}>Active Directives & Milestones</Text>

            {loading ? (
              <ActivityIndicator color="#7c69ef" style={{ marginVertical: 20 }} />
            ) : tasks.length > 0 ? (
              tasks.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.planCard, item.status === "DONE" && styles.planCardDone]}
                  onPress={() => handleToggleDone(item)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkboxCircle,
                      item.status === "DONE" && styles.checkboxCircleChecked,
                    ]}
                  >
                    {item.status === "DONE" && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.planTitle,
                        item.status === "DONE" && styles.planTitleDone,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.planSub}>Owner #{item.owner_id} · {item.status}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>No other tasks pending.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Join/Action Button */}
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={styles.joinBtn}
            activeOpacity={0.85}
            onPress={() => {
              Alert.alert("Success", "Directive acknowledged and synchronized.");
              router.push("/");
            }}
          >
            <Text style={styles.joinBtnText}>Acknowledge & Sync</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  iconBtnRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  closeIcon: {
    fontSize: 14,
    color: "#1c1c1e",
    fontWeight: "700",
  },
  editIcon: {
    fontSize: 16,
  },
  timeBadgeRow: {
    marginBottom: 12,
  },
  timePill: {
    alignSelf: "flex-start",
    backgroundColor: "#f2f2f7",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7c69ef",
  },
  titleBlock: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1c1c1e",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#8e8e93",
    lineHeight: 20,
  },
  membersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  avatarStack: {
    height: 40,
    width: 120,
    position: "relative",
  },
  stackAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    position: "absolute",
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#e5e5ea",
  },
  assignedBadge: {
    backgroundColor: "rgba(124, 105, 239, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  assignedText: {
    color: "#7c69ef",
    fontSize: 12,
    fontWeight: "700",
  },
  planSection: {
    marginBottom: 20,
  },
  planHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1c1c1e",
    marginBottom: 16,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  planCardDone: {
    backgroundColor: "#f2f9f4",
    borderColor: "#c3e6cb",
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c7c7cc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircleChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkMark: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1c1c1e",
  },
  planTitleDone: {
    textDecorationLine: "line-through",
    color: "#8e8e93",
  },
  planSub: {
    fontSize: 11,
    color: "#8e8e93",
    marginTop: 2,
  },
  footerAction: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  joinBtn: {
    backgroundColor: "#1c1c1e",
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  joinBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
