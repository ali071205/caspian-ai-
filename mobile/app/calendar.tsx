import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../src/theme";
import { membersData } from "../src/data";
import { getTasks, setTaskStatus, createTask, getMembers, Task, Member, TaskStatus } from "../src/api";

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(20);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOwnerId, setNewOwnerId] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const days = [
    { num: 16, day: "Sun" },
    { num: 17, day: "Mon" },
    { num: 18, day: "Tue" },
    { num: 19, day: "Wed" },
    { num: 20, day: "Thu" },
    { num: 21, day: "Fri" },
    { num: 22, day: "Sat" },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [t, m] = await Promise.all([getTasks(), getMembers()]);
      setTasks(t);
      setMembers(m);
      if (m.length > 0) setNewOwnerId(m[0].id);
    } catch (err) {
      console.warn("Calendar load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    try {
      await setTaskStatus(taskId, newStatus);
      Alert.alert("Status Updated", `Task #${taskId} is now ${newStatus}`);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status");
    }
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Required", "Please enter a task title.");
      return;
    }
    setSubmitting(true);
    try {
      await createTask({
        title: newTitle.trim(),
        owner_id: newOwnerId,
        deadline: new Date(2026, 7, selectedDay, 18, 0).toISOString(),
      });
      setNewTitle("");
      setCreateModalVisible(false);
      Alert.alert("Task Created", "Task assigned and added to calendar!");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const displayTasks = tasks.length > 0 ? tasks : [
    { id: 1, title: "Healthcare Dashboard UI", description: "Design Team", owner_id: 1, deadline: "2026-08-20T18:00:00", status: "IN_PROGRESS" as const, at_risk: false },
    { id: 2, title: "Automated Regression Test Suite", description: "QA Lead", owner_id: 2, deadline: "2026-08-20T18:00:00", status: "TODO" as const, at_risk: false },
  ];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconBtnRound}
              onPress={() => router.back()}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Task Calendar</Text>

            <TouchableOpacity 
              style={styles.iconBtnRound}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Month Label */}
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>August 2026</Text>
            <TouchableOpacity onPress={loadData}>
              <Text style={styles.refreshText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Date Strip */}
          <View style={styles.dateStrip}>
            {days.map((d) => (
              <TouchableOpacity
                key={d.num}
                style={[
                  styles.dateItem,
                  selectedDay === d.num && styles.dateItemActive,
                ]}
                onPress={() => setSelectedDay(d.num)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateNum,
                    selectedDay === d.num && styles.dateNumActive,
                  ]}
                >
                  {d.num}
                </Text>
                <Text
                  style={[
                    styles.dateDay,
                    selectedDay === d.num && styles.dateDayActive,
                  ]}
                >
                  {d.day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Schedule Section */}
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleHeaderRow}>
              <Text style={styles.sectionHeading}>Scheduled Directives</Text>
              <TouchableOpacity 
                style={styles.addBtnSmall}
                onPress={() => setCreateModalVisible(true)}
              >
                <Text style={styles.addBtnSmallText}>+ New Task</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#7c69ef" style={{ marginVertical: 20 }} />
            ) : (
              displayTasks.map((t) => (
                <View key={t.id} style={styles.taskCard}>
                  <View style={styles.taskCardHeader}>
                    <Text style={styles.taskCardTitle}>{t.title}</Text>
                    <View style={[styles.statusBadge, t.status === "DONE" ? styles.statusDone : t.status === "BLOCKED" ? styles.statusBlocked : styles.statusProgress]}>
                      <Text style={styles.statusBadgeText}>{t.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.taskCardMeta}>
                    Owner ID: #{t.owner_id} · Due: {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Thursday"}
                  </Text>

                  {/* Status Action Buttons */}
                  <View style={styles.actionPillsRow}>
                    <TouchableOpacity 
                      style={[styles.statusPill, t.status === "IN_PROGRESS" && styles.statusPillActive]}
                      onPress={() => handleStatusChange(t.id, "IN_PROGRESS")}
                    >
                      <Text style={styles.statusPillText}>In Progress</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.statusPill, t.status === "BLOCKED" && styles.statusPillActive]}
                      onPress={() => handleStatusChange(t.id, "BLOCKED")}
                    >
                      <Text style={styles.statusPillText}>Blocked</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.statusPill, styles.statusPillDone, t.status === "DONE" && styles.statusPillActive]}
                      onPress={() => handleStatusChange(t.id, "DONE")}
                    >
                      <Text style={styles.statusPillText}>Done ✓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Create Task Modal */}
        <Modal visible={createModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create New Task</Text>

              <Text style={styles.inputLabel}>Task Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Implement Figma login screen"
                placeholderTextColor="#777"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Assign to Member</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(members.length > 0 ? members : [{ id: 1, name: "Ali", role: "Lead" }]).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChoice, newOwnerId === m.id && styles.memberChoiceActive]}
                    onPress={() => setNewOwnerId(m.id)}
                  >
                    <Text style={[styles.memberChoiceText, newOwnerId === m.id && styles.memberChoiceTextActive]}>
                      {m.name} ({m.role?.split(" ")[0]})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={handleCreateTask}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createBtnText}>Assign & Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/")}
          >
            <Text style={styles.navIcon}>🏠</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Text style={styles.navIcon}>📅</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/plan")}
          >
            <Text style={styles.navIcon}>📋</Text>
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
    backgroundColor: "#f7f8fc",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  backArrow: {
    fontSize: 22,
    color: "#1c1c1e",
    fontWeight: "600",
  },
  plusIcon: {
    fontSize: 20,
    color: "#7c69ef",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  refreshText: {
    fontSize: 12,
    color: "#7c69ef",
    fontWeight: "600",
  },
  dateStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  dateItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 64,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  dateItemActive: {
    backgroundColor: "#1c1c1e",
    borderColor: "#1c1c1e",
  },
  dateNum: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  dateNumActive: {
    color: "#ffffff",
  },
  dateDay: {
    fontSize: 11,
    color: "#8e8e93",
    marginTop: 2,
  },
  dateDayActive: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  scheduleSection: {
    marginBottom: 20,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  addBtnSmall: {
    backgroundColor: "#7c69ef",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addBtnSmallText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  taskCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1c1c1e",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusProgress: {
    backgroundColor: "rgba(124, 105, 239, 0.15)",
  },
  statusBlocked: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  statusDone: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  taskCardMeta: {
    fontSize: 12,
    color: "#8e8e93",
    marginBottom: 12,
  },
  actionPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f2f2f7",
  },
  statusPillActive: {
    backgroundColor: "#7c69ef",
  },
  statusPillDone: {
    backgroundColor: "#e8f9ed",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1c1c1e",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#161824",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(124, 105, 239, 0.3)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: "#9aa5b8",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#0e1017",
    borderWidth: 1,
    borderColor: "#2d3142",
    borderRadius: 8,
    color: "#fff",
    padding: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  memberChoice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#212433",
    marginRight: 8,
  },
  memberChoiceActive: {
    backgroundColor: "#7c69ef",
  },
  memberChoiceText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
  },
  memberChoiceTextActive: {
    color: "#fff",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#212433",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#aaa",
    fontWeight: "600",
  },
  createBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#7c69ef",
    alignItems: "center",
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  bottomNav: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: "#1c1c1e",
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  navItem: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  navItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  navIcon: {
    fontSize: 20,
  },
});
