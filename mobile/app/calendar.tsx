import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getTasks, setTaskStatus, createTask, getMembers, Task, Member, TaskStatus } from "../src/api";
import { AppIcon } from "../src/components/Icons";
import { BottomNav } from "../src/components/BottomNav";
import { useSession } from "../src/session";

export default function CalendarScreen() {
  const { user } = useSession();
  const [selectedDay, setSelectedDay] = useState(16);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOwnerId, setNewOwnerId] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "DONE" | "ALL">("ACTIVE");

  const days = [
    { num: 16, day: "Sun" }, { num: 17, day: "Mon" }, { num: 18, day: "Tue" },
    { num: 19, day: "Wed" }, { num: 20, day: "Thu" }, { num: 21, day: "Fri" }, { num: 22, day: "Sat" },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const teamCode = user?.team_code || undefined;
      const [t, m] = await Promise.all([
        getTasks(undefined, teamCode),
        getMembers(teamCode),
      ]);
      setTasks(t);
      setMembers(m);
      if (m.length > 0) setNewOwnerId(m[0].id);
    } catch (err) {
      console.warn("Calendar load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    try {
      setTasks(prev => prev.map(item => item.id === taskId ? { ...item, status: newStatus } : item));
      await setTaskStatus(taskId, newStatus);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status");
      loadData();
    }
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return Alert.alert("Required", "Please enter task title.");
    setSubmitting(true);
    try {
      await createTask({
        title: newTitle.trim(),
        owner_id: newOwnerId,
        deadline: new Date(2026, 7, selectedDay, 18, 0).toISOString(),
      });
      setNewTitle("");
      setCreateModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDate = new Date(2026, 7, selectedDay);
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const selectedDayTime = startOfDay(selectedDate);
  const todayTime = startOfDay(new Date());
  const oneDayMs = 24 * 60 * 60 * 1000;
  const isIncomplete = (task: Task) => task.status !== "DONE" && task.status !== "CANCELLED";
  const isOverdueOnSelectedDay = (task: Task) => {
    if (!task.deadline || !isIncomplete(task)) return false;
    const deadlineDay = startOfDay(new Date(task.deadline));
    return selectedDayTime === todayTime && deadlineDay === selectedDayTime - oneDayMs;
  };
  const scheduledTasks = tasks.filter((task) => {
    if (!task.deadline) return false;
    const deadlineDay = startOfDay(new Date(task.deadline));
    const isDueOnSelectedDay = deadlineDay === selectedDayTime;
    const isYesterdayCarryOver =
      selectedDayTime === todayTime &&
      deadlineDay === selectedDayTime - oneDayMs &&
      isIncomplete(task);
    return isDueOnSelectedDay || isYesterdayCarryOver;
  });
  const activeTasks = scheduledTasks.filter(isIncomplete);
  const completedTasks = scheduledTasks.filter(t => t.status === "DONE");
  const displayTasks = statusFilter === "ACTIVE" ? activeTasks : statusFilter === "DONE" ? completedTasks : scheduledTasks;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <AppIcon name="arrow-back" size={20} color="#1c1c1e" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Task Calendar & Schedule</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setCreateModalVisible(true)}>
              <AppIcon name="add" size={20} color="#7c69ef" />
            </TouchableOpacity>
          </View>

          {/* Month & Sync */}
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>August 2026</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
              <AppIcon name="refresh" size={13} color="#7c69ef" />
              <Text style={styles.refreshText}>Sync</Text>
            </TouchableOpacity>
          </View>

          {/* Date Strip */}
          <View style={styles.dateStrip}>
            {days.map((d) => (
              <TouchableOpacity
                key={d.num}
                style={[styles.dateItem, selectedDay === d.num && styles.dateItemActive]}
                onPress={() => setSelectedDay(d.num)}
              >
                <Text style={[styles.dateNum, selectedDay === d.num && styles.dateNumActive]}>{d.num}</Text>
                <Text style={[styles.dateDay, selectedDay === d.num && styles.dateDayActive]}>{d.day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabsRow}>
            {[
              { key: "ACTIVE", label: `⚡ Active (${activeTasks.length})` },
              { key: "DONE", label: `✓ Done (${completedTasks.length})` },
              { key: "ALL", label: `All (${scheduledTasks.length})` },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, statusFilter === f.key && styles.filterTabActive]}
                onPress={() => setStatusFilter(f.key as any)}
              >
                <Text style={[styles.filterTabText, statusFilter === f.key && styles.filterTabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tasks List */}
          {loading ? (
            <ActivityIndicator color="#7c69ef" style={{ marginVertical: 20 }} />
          ) : displayTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No scheduled tasks</Text>
              <Text style={styles.emptySub}>Tap "+" above to assign work for August {selectedDay}.</Text>
            </View>
          ) : (
            displayTasks.map((t) => {
              const owner = members.find(m => m.id === t.owner_id);
              const isDone = t.status === "DONE";
              const isOverdue = isOverdueOnSelectedDay(t);
              return (
                <View key={t.id} style={[styles.taskCard, isDone && styles.taskCardDone, isOverdue && styles.taskCardOverdue]}>
                  <View style={styles.taskHeader}>
                    <View style={{ flex: 1 }}>
                      {isOverdue && <Text style={styles.overdueWarning}>⚠ Overdue from {new Date(t.deadline!).toLocaleDateString()}</Text>}
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{t.title}</Text>
                      <Text style={styles.taskMeta}>👤 {owner?.name || `Member #${t.owner_id}`} · Status: {t.status}</Text>
                    </View>
                    <View style={styles.actionPills}>
                      <TouchableOpacity
                        style={[styles.statusPill, isDone && styles.statusPillDone]}
                        onPress={() => handleStatusChange(t.id, isDone ? "IN_PROGRESS" : "DONE")}
                      >
                        <Text style={[styles.statusPillText, isDone && styles.statusPillTextDone]}>
                          {isDone ? "✓ Done" : "○ Mark Done"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Solid Bottom Navigation Bar */}
        <BottomNav activeTab="calendar" />

        {/* Create Task Modal */}
        <Modal visible={createModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Assign New Directive</Text>
              <Text style={styles.inputLabel}>Task Title</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Audit database indexing" value={newTitle} onChangeText={setNewTitle} />

              <Text style={styles.inputLabel}>Assignee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChoice, newOwnerId === m.id && styles.memberChoiceActive]}
                    onPress={() => setNewOwnerId(m.id)}
                  >
                    <Text style={[styles.memberChoiceText, newOwnerId === m.id && styles.memberChoiceTextActive]}>👤 {m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTask} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Create Task</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: { flex: 1, backgroundColor: "#f7f8fc", width: "100%" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e5ea" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1c1c1e" },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  monthLabel: { fontSize: 17, fontWeight: "800", color: "#1c1c1e" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(124, 105, 239, 0.08)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  refreshText: { fontSize: 12, color: "#7c69ef", fontWeight: "600" },
  dateStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  dateItem: { alignItems: "center", justifyContent: "center", width: 42, height: 56, borderRadius: 16, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e5ea" },
  dateItemActive: { backgroundColor: "#7c69ef", borderColor: "#7c69ef" },
  dateNum: { fontSize: 15, fontWeight: "700", color: "#1c1c1e" },
  dateNumActive: { color: "#ffffff" },
  dateDay: { fontSize: 10, color: "#8e8e93", marginTop: 2 },
  dateDayActive: { color: "rgba(255, 255, 255, 0.8)" },
  filterTabsRow: { flexDirection: "row", backgroundColor: "#e5e5ea", borderRadius: 10, padding: 3, marginBottom: 14, gap: 4 },
  filterTab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  filterTabActive: { backgroundColor: "#ffffff" },
  filterTabText: { fontSize: 11, fontWeight: "600", color: "#8e8e93" },
  filterTabTextActive: { color: "#1c1c1e", fontWeight: "700" },
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#e5e5ea" },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#1c1c1e", marginBottom: 4 },
  emptySub: { fontSize: 12, color: "#8e8e93" },
  taskCard: { backgroundColor: "#ffffff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e5e5ea" },
  taskCardDone: { backgroundColor: "#f9fafb", opacity: 0.75 },
  taskCardOverdue: { borderColor: "#f59e0b", borderLeftWidth: 4 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskTitle: { fontSize: 14, fontWeight: "700", color: "#1c1c1e", marginBottom: 4 },
  taskTitleDone: { textDecorationLine: "line-through", color: "#9ca3af" },
  overdueWarning: { color: "#b45309", fontSize: 10, fontWeight: "800", marginBottom: 4 },
  taskMeta: { fontSize: 11, color: "#6b7280" },
  actionPills: { flexDirection: "row", gap: 6 },
  statusPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(124, 105, 239, 0.1)", borderWidth: 1, borderColor: "rgba(124, 105, 239, 0.3)" },
  statusPillDone: { backgroundColor: "rgba(34, 197, 94, 0.15)", borderColor: "rgba(34, 197, 94, 0.4)" },
  statusPillText: { fontSize: 11, fontWeight: "700", color: "#7c69ef" },
  statusPillTextDone: { color: "#16a34a" },
  bottomNav: { position: "absolute", bottom: 20, left: 20, right: 20, backgroundColor: "#161826", borderRadius: 24, flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, elevation: 8 },
  navItem: { padding: 8, borderRadius: 14 },
  navItemActive: { backgroundColor: "rgba(124, 105, 239, 0.2)" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#ffffff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1c1c1e", marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 },
  modalInput: { backgroundColor: "#f3f4f6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#1c1c1e", marginBottom: 12 },
  memberChoice: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#f3f4f6", marginRight: 8 },
  memberChoiceActive: { backgroundColor: "#7c69ef" },
  memberChoiceText: { fontSize: 11, fontWeight: "600", color: "#4b5563" },
  memberChoiceTextActive: { color: "#ffffff" },
  modalBtnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelBtnText: { color: "#4b5563", fontSize: 13, fontWeight: "600" },
  submitBtn: { flex: 2, paddingVertical: 11, borderRadius: 8, backgroundColor: "#7c69ef", alignItems: "center" },
  submitBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
});
