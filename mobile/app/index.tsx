import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { membersData } from "../src/data";
import { 
  getTasks, 
  getMembers, 
  getPendingMembers, 
  approveMember, 
  rejectMember, 
  sendChat, 
  setTaskStatus, 
  Task, 
  Member, 
  UserAuth 
} from "../src/api";
import { AuthModal } from "../src/components/AuthModal";
import { AppIcon } from "../src/components/Icons";

export default function HomeScreen() {
  const [currentUser, setCurrentUser] = useState<UserAuth | null>({
    user_id: 1,
    name: "Ali (Admin)",
    role: "Admin / Workspace Owner",
    team_code: "CASPIAN-2026",
    team_name: "Caspian Sentinel Team",
    token: "demo-1",
  });

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [teamCode, setTeamCode] = useState("CASPIAN-2026");
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<number | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<"ACTIVE" | "DONE" | "ALL">("ACTIVE");
  const [logoutVisible, setLogoutVisible] = useState(false);

  const isAdmin = currentUser?.role?.toLowerCase().includes("admin") ?? false;

  const handleLogout = () => {
    if (!currentUser) { setAuthModalVisible(true); return; }
    setLogoutVisible(true);
  };

  const confirmLogout = () => {
    setLogoutVisible(false);
    setCurrentUser(null);
    setTasks([]);
    setMembers([]);
    setPendingMembers([]);
    setAuthModalVisible(true);
  };

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [fTasks, fMembers, fPending] = await Promise.allSettled([
        getTasks(undefined, currentUser.team_code),
        getMembers(currentUser.team_code),
        isAdmin ? getPendingMembers(currentUser.team_code) : Promise.resolve([]),
      ]);
      if (fTasks.status === "fulfilled") setTasks(fTasks.value);
      if (fMembers.status === "fulfilled") setMembers(fMembers.value);
      if (fPending.status === "fulfilled") setPendingMembers(fPending.value);
      setTeamCode(currentUser.team_code);
    } catch (err) {
      console.warn("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const interval = setInterval(() => {
      getPendingMembers(currentUser.team_code).then(setPendingMembers).catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [currentUser, isAdmin]);

  const handleApprove = async (userId: number, name: string) => {
    if (!currentUser) return;
    try {
      await approveMember(userId, currentUser.team_code);
      Alert.alert("Approved", `${name} is now active.`);
      loadDashboardData();
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const handleReject = async (userId: number, name: string) => {
    if (!currentUser) return;
    try {
      await rejectMember(userId, currentUser.team_code);
      Alert.alert("Rejected", `Join request for ${name} rejected.`);
      loadDashboardData();
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const handleSendChat = async (customPrompt?: string) => {
    if (!currentUser) { setAuthModalVisible(true); return; }
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim()) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const res = await sendChat(textToSend.trim(), currentUser.name);
      setChatResponse(res.reply);
      if (!customPrompt) setChatInput("");
      loadDashboardData();
    } catch (err: any) {
      Alert.alert("Sentinel AI Error", err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "DONE" ? "IN_PROGRESS" : "DONE";
    try {
      await setTaskStatus(taskId, nextStatus as any);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus as any } : t));
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const relevantTasks = tasks.filter((t) => {
    if (!currentUser) return false;
    if (!isAdmin) return t.owner_id === currentUser.user_id;
    if (memberFilter !== null) return t.owner_id === memberFilter;
    return true;
  });

  const activeTasks = relevantTasks.filter(t => t.status !== "DONE" && t.status !== "CANCELLED");
  const completedTasks = relevantTasks.filter(t => t.status === "DONE");
  const displayTasks = taskStatusFilter === "ACTIVE" ? activeTasks : taskStatusFilter === "DONE" ? completedTasks : relevantTasks;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.profileRow}
              onPress={currentUser ? handleLogout : () => setAuthModalVisible(true)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: membersData[0].avatar }} style={styles.avatarMain} />
              <View>
                <Text style={styles.greetingText}>{currentUser ? "Good Morning !" : "Session Locked"}</Text>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{currentUser ? currentUser.name : "Guest User"}</Text>
                  {currentUser && <Text style={styles.roleBadge}>{isAdmin ? "Admin" : "Member"}</Text>}
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              {!currentUser && (
                <TouchableOpacity style={styles.authBtn} onPress={() => setAuthModalVisible(true)} activeOpacity={0.7}>
                  <AppIcon name="login" size={13} color="#fff" />
                  <Text style={styles.authBtnText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Team Code Bar */}
          {isAdmin && (
            <View style={styles.teamCodeBanner}>
              <View>
                <Text style={styles.teamCodeLabel}>TEAM INVITE CODE</Text>
                <Text style={styles.teamCodeVal}>{teamCode}</Text>
              </View>
              <TouchableOpacity 
                style={styles.shareBtn}
                onPress={() => Alert.alert("Team Code", `Share this code with employees to join: ${teamCode}`)}
              >
                <Text style={styles.shareBtnText}>Share Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Project Architecture Hub Banner */}
          <TouchableOpacity 
            style={styles.projectHubBanner}
            onPress={() => router.push("/project")}
            activeOpacity={0.8}
          >
            <View style={styles.projectHubIcon}>
              <AppIcon name="categories" size={16} color="#7c69ef" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectHubTitle}>Project Architecture & GitHub Hub</Text>
              <Text style={styles.projectHubSub}>ali071205/caspian-ai- · Specs, Endpoints & Roles</Text>
            </View>
            <AppIcon name="arrow-forward" size={16} color="#7c69ef" />
          </TouchableOpacity>

          {/* Pending Approvals (Admin) */}
          {isAdmin && pendingMembers.length > 0 && (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>⏳ Pending Approvals ({pendingMembers.length})</Text>
              {pendingMembers.map((m) => (
                <View key={m.id} style={styles.pendingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>{m.name}</Text>
                    <Text style={styles.pendingRole}>{m.role} · {m.email}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(m.id, m.name)}>
                      <Text style={styles.btnActionText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnReject} onPress={() => handleReject(m.id, m.name)}>
                      <Text style={styles.btnActionText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Sentinel AI Input Card */}
          <View style={styles.sentinelCard}>
            <View style={styles.sentinelHeader}>
              <View style={styles.sentinelBadge}>
                <AppIcon name="shield" variant="filled" size={13} color="#7c69ef" />
                <Text style={styles.sentinelBadgeText}>Caspian Central AI</Text>
              </View>
              <Text style={styles.sentinelHint}>Task assignment engine</Text>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="e.g. Kevin, please fix payment gateway by Friday"
                placeholderTextColor="#999"
                value={chatInput}
                onChangeText={setChatInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendChat()} disabled={chatLoading}>
                {chatLoading ? <ActivityIndicator color="#fff" size="small" /> : <AppIcon name="send" size={15} color="#fff" />}
              </TouchableOpacity>
            </View>

            {chatResponse && (
              <View style={styles.responseBox}>
                <Text style={styles.responseText}>🤖 {chatResponse}</Text>
              </View>
            )}
          </View>

          {/* Members Filter (Admin) */}
          {isAdmin && (
            <View style={styles.membersSection}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Team Filter</Text>
                {memberFilter !== null && (
                  <TouchableOpacity onPress={() => setMemberFilter(null)}>
                    <Text style={{ color: "#7c69ef", fontSize: 11, fontWeight: "700" }}>Show All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.memberChip, memberFilter === null && styles.memberChipActive]}
                  onPress={() => setMemberFilter(null)}
                >
                  <Text style={[styles.memberChipText, memberFilter === null && styles.memberChipTextActive]}>All ({tasks.length})</Text>
                </TouchableOpacity>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChip, memberFilter === m.id && styles.memberChipActive]}
                    onPress={() => setMemberFilter(m.id)}
                  >
                    <Text style={[styles.memberChipText, memberFilter === m.id && styles.memberChipTextActive]}>👤 {m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Status Filter Tabs */}
          <View style={styles.filterTabsRow}>
            {[
              { key: "ACTIVE", label: `⚡ Active (${activeTasks.length})` },
              { key: "DONE", label: `✓ Done (${completedTasks.length})` },
              { key: "ALL", label: `All (${relevantTasks.length})` },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, taskStatusFilter === f.key && styles.filterTabActive]}
                onPress={() => setTaskStatusFilter(f.key as any)}
              >
                <Text style={[styles.filterTabText, taskStatusFilter === f.key && styles.filterTabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Task Pipeline List */}
          <View style={{ gap: 10 }}>
            {loading ? (
              <ActivityIndicator color="#7c69ef" style={{ marginVertical: 20 }} />
            ) : displayTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{taskStatusFilter === "DONE" ? "No completed tasks" : "Pipeline is clear!"}</Text>
                <Text style={styles.emptySub}>Assign directives above to dispatch work.</Text>
              </View>
            ) : (
              displayTasks.map((item) => {
                const owner = members.find(m => m.id === item.owner_id);
                const isDone = item.status === "DONE";
                return (
                  <View key={item.id} style={[styles.taskCard, isDone && styles.taskCardDone]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{item.title}</Text>
                        <Text style={styles.taskMeta}>👤 {owner?.name || `Member #${item.owner_id}`} · Due: {item.deadline ? new Date(item.deadline).toLocaleDateString() : "Flexible"}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.toggleBtn, isDone && styles.toggleBtnActive]}
                        onPress={() => handleToggleTaskStatus(item.id, item.status)}
                      >
                        <Text style={[styles.toggleText, isDone && styles.toggleTextActive]}>{isDone ? "✓ Done" : "○ Mark"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Floating Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <AppIcon name="home" variant="filled" size={22} color="#7c69ef" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/calendar")}>
            <AppIcon name="library" variant="outline" size={22} color="#9aa5b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/plan")}>
            <AppIcon name="edit" variant="outline" size={22} color="#9aa5b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/project")}>
            <AppIcon name="categories" variant="outline" size={22} color="#9aa5b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={currentUser ? handleLogout : () => setAuthModalVisible(true)}>
            <AppIcon name="user" variant="outline" size={22} color="#9aa5b8" />
          </TouchableOpacity>
        </View>

        {/* Auth Modal */}
        <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
          <View style={styles.logoutOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setLogoutVisible(false)} />
            <View style={styles.logoutSheet}>
              <View style={styles.logoutHandle} />
              <View style={styles.logoutIcon}><AppIcon name="logout" size={22} color="#ef4444" /></View>
              <Text style={styles.logoutTitle}>Sign out?</Text>
              <Text style={styles.logoutMessage}>You’ll need to sign in again to open {currentUser?.name || "this account"}.</Text>
              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={confirmLogout}>
                <Text style={styles.logoutConfirmText}>Sign out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.logoutCancelText}>Stay signed in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <AuthModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            setTeamCode(u.team_code);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#ffffff", paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 6 : 0 },
  container: { flex: 1, backgroundColor: "#f7f8fc" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarMain: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eee" },
  greetingText: { fontSize: 11, color: "#8e8e93", fontWeight: "500" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 14, fontWeight: "700", color: "#1c1c1e" },
  roleBadge: { fontSize: 9, fontWeight: "700", backgroundColor: "rgba(124, 105, 239, 0.15)", color: "#7c69ef", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  headerRightActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoutBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239, 68, 68, 0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  logoutBtnText: { color: "#ef4444", fontSize: 11, fontWeight: "700" },
  authBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#7c69ef", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  authBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  bellBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e5ea" },
  logoutOverlay: { flex: 1, backgroundColor: "rgba(18, 17, 35, 0.48)", justifyContent: "flex-end" },
  logoutSheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30, alignItems: "center" },
  logoutHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#d9d8e1", marginBottom: 20 },
  logoutIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff0f0", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoutTitle: { color: "#1c1b35", fontSize: 20, fontWeight: "800", marginBottom: 7 },
  logoutMessage: { color: "#777589", fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 300, marginBottom: 20 },
  logoutConfirmBtn: { width: "100%", backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  logoutConfirmText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  logoutCancelBtn: { width: "100%", paddingVertical: 13, alignItems: "center" },
  logoutCancelText: { color: "#5f58a8", fontSize: 13, fontWeight: "700" },
  teamCodeBanner: { backgroundColor: "#1c1b35", borderRadius: 12, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  teamCodeLabel: { color: "#a797ff", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  teamCodeVal: { color: "#ffffff", fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  shareBtn: { backgroundColor: "#7c69ef", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  shareBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  projectHubBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "rgba(124, 105, 239, 0.25)", borderRadius: 12, padding: 10, marginBottom: 12, gap: 8 },
  projectHubIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(124, 105, 239, 0.12)", alignItems: "center", justifyContent: "center" },
  projectHubTitle: { color: "#1c1c1e", fontSize: 12, fontWeight: "700" },
  projectHubSub: { color: "#7c69ef", fontSize: 10, marginTop: 1, fontWeight: "600" },
  pendingCard: { backgroundColor: "#fff4e5", borderRadius: 12, padding: 10, marginBottom: 12 },
  pendingTitle: { fontSize: 12, fontWeight: "700", color: "#b45309", marginBottom: 6 },
  pendingRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 8, borderRadius: 8, marginBottom: 4 },
  pendingName: { fontSize: 12, fontWeight: "700", color: "#1c1c1e" },
  pendingRole: { fontSize: 10, color: "#6b7280" },
  btnApprove: { backgroundColor: "#22c55e", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  btnReject: { backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5 },
  btnActionText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sentinelCard: { backgroundColor: "#ffffff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e5e5ea", marginBottom: 12 },
  sentinelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sentinelBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(124, 105, 239, 0.12)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
  sentinelBadgeText: { color: "#7c69ef", fontSize: 11, fontWeight: "700" },
  sentinelHint: { color: "#8e8e93", fontSize: 10 },
  inputRow: { flexDirection: "row", gap: 6 },
  chatInput: { flex: 1, backgroundColor: "#f7f8fc", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, borderWidth: 1, borderColor: "#e5e5ea" },
  sendBtn: { backgroundColor: "#7c69ef", borderRadius: 8, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  responseBox: { marginTop: 8, padding: 8, backgroundColor: "#f5f3ff", borderRadius: 6 },
  responseText: { color: "#6b21a8", fontSize: 11 },
  membersSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#1c1c1e" },
  memberChip: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e5ea", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  memberChipActive: { backgroundColor: "#7c69ef", borderColor: "#7c69ef" },
  memberChipText: { color: "#1c1c1e", fontSize: 11, fontWeight: "600" },
  memberChipTextActive: { color: "#ffffff" },
  filterTabsRow: { flexDirection: "row", backgroundColor: "#e5e5ea", borderRadius: 8, padding: 2, marginBottom: 12, gap: 3 },
  filterTab: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: "center" },
  filterTabActive: { backgroundColor: "#ffffff" },
  filterTabText: { fontSize: 10, fontWeight: "600", color: "#8e8e93" },
  filterTabTextActive: { color: "#1c1c1e", fontWeight: "700" },
  emptyCard: { alignItems: "center", backgroundColor: "#ffffff", borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#e5e5ea" },
  emptyTitle: { fontSize: 13, fontWeight: "700", color: "#1c1c1e" },
  emptySub: { fontSize: 11, color: "#8e8e93", marginTop: 2 },
  taskCard: { backgroundColor: "#ffffff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e5e5ea" },
  taskCardDone: { backgroundColor: "#f9fafb", opacity: 0.75 },
  taskTitle: { fontSize: 13, fontWeight: "700", color: "#1c1c1e", marginBottom: 2 },
  taskTitleDone: { textDecorationLine: "line-through", color: "#9ca3af" },
  taskMeta: { fontSize: 10, color: "#6b7280" },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(124, 105, 239, 0.1)" },
  toggleBtnActive: { backgroundColor: "rgba(34, 197, 94, 0.15)" },
  toggleText: { color: "#7c69ef", fontSize: 10, fontWeight: "700" },
  toggleTextActive: { color: "#16a34a" },
  bottomNav: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#161826", borderRadius: 22, flexDirection: "row", justifyContent: "space-around", paddingVertical: 8, elevation: 8 },
  navItem: { padding: 6, borderRadius: 12 },
  navItemActive: { backgroundColor: "rgba(124, 105, 239, 0.2)" },
});
