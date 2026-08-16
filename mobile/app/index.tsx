import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import { 
  getTasks, 
  getMembers, 
  getPendingMembers, 
  getConnections,
  approveMember, 
  rejectMember, 
  sendChat, 
  setTaskStatus, 
  respondToTask,
  Task, 
  Member, 
  UserAuth,
  Connection 
} from "../src/api";
import { AuthModal } from "../src/components/AuthModal";
import { ProfileModal } from "../src/components/ProfileModal";
import { BottomNav } from "../src/components/BottomNav";
import { AppIcon } from "../src/components/Icons";
import { VoiceAssistantModal } from "../src/components/VoiceAssistantModal";
import { TaskRejectModal } from "../src/components/TaskRejectModal";
import { TaskCompleteModal } from "../src/components/TaskCompleteModal";
import { TaskDetailModal } from "../src/components/TaskDetailModal";
import { useSession } from "../src/session";

export default function HomeScreen() {
  const { user: currentUser, loadingSession, saveSession, clearSession } = useSession();

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [rejectModalTask, setRejectModalTask] = useState<Task | null>(null);
  const [completeModalTask, setCompleteModalTask] = useState<Task | null>(null);
  const [detailModalTask, setDetailModalTask] = useState<Task | null>(null);
  const [taskActionLoadingId, setTaskActionLoadingId] = useState<number | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
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

  const confirmLogout = async () => {
    setLogoutVisible(false);
    await clearSession();
    setTasks([]);
    setMembers([]);
    setPendingMembers([]);
  };

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [fTasks, fMembers, fPending, fConns] = await Promise.allSettled([
        getTasks(undefined, currentUser.team_code),
        getMembers(currentUser.team_code),
        isAdmin ? getPendingMembers(currentUser.team_code) : Promise.resolve([]),
        getConnections(),
      ]);
      if (fTasks.status === "fulfilled") setTasks(fTasks.value);
      if (fMembers.status === "fulfilled") setMembers(fMembers.value);
      if (fPending.status === "fulfilled") setPendingMembers(fPending.value);
      if (fConns.status === "fulfilled") setConnections(fConns.value);
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

  const handleAcceptTask = async (taskId: number) => {
    setTaskActionLoadingId(taskId);
    try {
      await respondToTask(taskId, "accept", undefined, currentUser?.user_id);
      await loadDashboardData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to accept task");
    } finally {
      setTaskActionLoadingId(null);
    }
  };

  const handleConfirmRejectTask = async (taskId: number, reason: string) => {
    try {
      await respondToTask(taskId, "reject", reason, currentUser?.user_id);
      await loadDashboardData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to reject task");
      throw err;
    }
  };

  const handleConfirmCompleteTask = async (taskId: number, solution: string) => {
    try {
      await respondToTask(taskId, "complete", solution, currentUser?.user_id);
      await loadDashboardData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to complete task");
      throw err;
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

  const slackConn = connections.find(c => c.channel === "slack");
  const emailConn = connections.find(c => c.channel === "email");
  const isSlackActive = slackConn?.status === "active";
  const isEmailActive = emailConn?.status === "active";

  if (loadingSession) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" }}>
          <ActivityIndicator color="#7c69ef" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.landingContainer}>
          <View style={styles.landingHero}>
            <View style={styles.landingLogoBadge}>
              <AppIcon name="shield" size={36} color="#7c69ef" />
            </View>
            <Text style={styles.landingTitle}>Caspian TeamOps</Text>
            <Text style={styles.landingSubtitle}>
              Multi-Agent Workspace Orchestration & Autonomous Incident Command
            </Text>
          </View>

          <View style={styles.landingCard}>
            <Text style={styles.landingCardTitle}>Welcome to Workspace</Text>
            <Text style={styles.landingCardDesc}>
              Sign in as an Admin, or join a workspace using your team invite code.
            </Text>

            <TouchableOpacity
              style={styles.landingPrimaryBtn}
              onPress={() => setAuthModalVisible(true)}
              activeOpacity={0.8}
            >
              <AppIcon name="user" size={16} color="#ffffff" />
              <Text style={styles.landingPrimaryBtnText}>Sign In / Register Workspace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.landingSecondaryBtn}
              onPress={() => setAuthModalVisible(true)}
              activeOpacity={0.8}
            >
              <AppIcon name="shield" size={16} color="#7c69ef" />
              <Text style={styles.landingSecondaryBtnText}>Join with Team Invite Code</Text>
            </TouchableOpacity>
          </View>

          <AuthModal
            visible={authModalVisible}
            onClose={() => setAuthModalVisible(false)}
            onSuccess={async (u) => {
              await saveSession(u);
              setTeamCode(u.team_code);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Modern App Header */}
        <View style={styles.appHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.brandIconBox}>
              <AppIcon name="shield" variant="filled" size={16} color="#7c69ef" />
            </View>
            <View>
              <Text style={styles.appTitle}>CASPIAN</Text>
              <Text style={styles.workspaceSubtitle}>
                {currentUser?.team_name || "Team Workspace"} · {currentUser?.team_code || teamCode}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {currentUser && (
              <TouchableOpacity
                style={styles.profileAvatar}
                onPress={() => setProfileModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.profileAvatarText}>
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Integrations Bar */}
          {currentUser && (
            (isSlackActive || isEmailActive) && (
              <TouchableOpacity
                style={styles.activeChannelsBanner}
                onPress={() => router.push("/calendar")}
                activeOpacity={0.8}
              >
                <View style={styles.activePill}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.activePillText}>Slack: {slackConn?.detail?.replace("Connected: ", "") || "Active"}</Text>
                </View>
                <View style={styles.activePill}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.activePillText}>Email: Active</Text>
                </View>
              </TouchableOpacity>
            )
          )}

          {/* Pending Approvals (Admin) */}
          {isAdmin && pendingMembers.length > 0 && (
            <View style={styles.pendingCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={styles.pendingTitle}>⏳ Pending Join Requests ({pendingMembers.length})</Text>
                <TouchableOpacity onPress={() => router.push("/plan")}>
                  <Text style={{ color: "#7c69ef", fontSize: 11, fontWeight: "700" }}>Manage Team →</Text>
                </TouchableOpacity>
              </View>
              {pendingMembers.map((m) => (
                <View key={m.id} style={styles.pendingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>{m.name}</Text>
                    <Text style={styles.pendingRole}>{m.role} · {m.email}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(m.id, m.name)}>
                      <Text style={styles.btnActionText}>✓ Approve</Text>
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
              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: "#26293d", marginRight: 6 }]} 
                onPress={() => setVoiceModalVisible(true)}
              >
                <AppIcon name="mic" size={16} color="#a797ff" />
              </TouchableOpacity>
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
                const isPendingAck = item.status === "PENDING_ACK";
                const isCancelled = item.status === "CANCELLED";
                const rejectionReason = item.description?.includes("[REJECTED by")
                  ? item.description.substring(item.description.indexOf("[REJECTED by")).split("\n")[0]
                  : null;
                const resolutionSummary = item.description?.includes("[RESOLVED by")
                  ? item.description.substring(item.description.indexOf("[RESOLVED by")).split("\n")[0]
                  : null;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.taskCard, isDone && styles.taskCardDone, isCancelled && styles.taskCardCancelled]}
                    onPress={() => setDetailModalTask(item)}
                    activeOpacity={0.92}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone, isCancelled && styles.taskTitleCancelled]}>
                            {item.title}
                          </Text>
                          {isPendingAck && (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingBadgeText}>⏳ Awaiting Ack</Text>
                            </View>
                          )}
                          {isCancelled && (
                            <View style={styles.cancelledBadge}>
                              <Text style={styles.cancelledBadgeText}>✕ Declined</Text>
                            </View>
                          )}
                          {isDone && (
                            <View style={styles.doneBadge}>
                              <Text style={styles.doneBadgeText}>✓ Solved</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.taskMeta}>
                          👤 {owner?.name || `Member #${item.owner_id}`} · Due: {item.deadline ? new Date(item.deadline).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Flexible"}
                        </Text>
                        
                        {/* AI Summary Link */}
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 5 }}>
                          <View style={styles.aiSummaryBadge}>
                            <Text style={styles.aiSummaryBadgeText}>ℹ️ Tap to view AI Summary & Details</Text>
                          </View>
                        </View>

                        {rejectionReason && (
                          <Text style={styles.rejectionReasonText}>
                            ⚠️ {rejectionReason}
                          </Text>
                        )}

                        {resolutionSummary && (
                          <Text style={styles.resolutionReasonText}>
                            ✓ {resolutionSummary}
                          </Text>
                        )}
                      </View>

                      {isPendingAck ? (
                        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                          <TouchableOpacity
                            style={styles.taskAcceptBtn}
                            onPress={() => handleAcceptTask(item.id)}
                            disabled={taskActionLoadingId === item.id}
                            activeOpacity={0.8}
                          >
                            {taskActionLoadingId === item.id ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text style={styles.taskAcceptBtnText}>✓ Accept</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.taskRejectBtn}
                            onPress={() => setRejectModalTask(item)}
                            disabled={taskActionLoadingId === item.id}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.taskRejectBtnText}>✕ Reject</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.toggleBtn, isDone && styles.toggleBtnActive, isCancelled && styles.toggleBtnCancelled]}
                          onPress={() => {
                            if (isDone) {
                              handleToggleTaskStatus(item.id, item.status);
                            } else {
                              setCompleteModalTask(item);
                            }
                          }}
                        >
                          <Text style={[styles.toggleText, isDone && styles.toggleTextActive, isCancelled && styles.toggleTextCancelled]}>
                            {isDone ? "✓ Done" : isCancelled ? "✕ Closed" : "✓ Mark Done"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Solid Bottom Navigation Bar */}
        <BottomNav activeTab="home" />

        {/* Task Details & AI Problem Summary Modal */}
        <TaskDetailModal
          visible={!!detailModalTask}
          task={detailModalTask}
          owner={members.find(m => m.id === detailModalTask?.owner_id)}
          onClose={() => setDetailModalTask(null)}
          onAccept={(id) => handleAcceptTask(id)}
          onOpenReject={(t) => setRejectModalTask(t)}
          onOpenComplete={(t) => setCompleteModalTask(t)}
        />

        {/* Task Rejection Modal */}
        <TaskRejectModal
          visible={!!rejectModalTask}
          task={rejectModalTask}
          onClose={() => setRejectModalTask(null)}
          onConfirmReject={handleConfirmRejectTask}
        />

        {/* Task Complete & Resolution Modal */}
        <TaskCompleteModal
          visible={!!completeModalTask}
          task={completeModalTask}
          onClose={() => setCompleteModalTask(null)}
          onConfirmComplete={handleConfirmCompleteTask}
        />

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
          onSuccess={async (u) => {
            await saveSession(u);
            setTeamCode(u.team_code);
          }}
        />

        <ProfileModal
          visible={profileModalVisible}
          onClose={() => {
            setProfileModalVisible(false);
            loadDashboardData();
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <VoiceAssistantModal
          visible={voiceModalVisible}
          onClose={() => setVoiceModalVisible(false)}
          senderName={currentUser?.name || "Admin"}
          teamCode={currentUser?.team_code || teamCode}
          members={members}
          onTaskCreated={loadDashboardData}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, backgroundColor: "#f7f8fc", width: "100%" },
  landingContainer: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 24, justifyContent: "center", alignItems: "center" },
  landingHero: { alignItems: "center", marginBottom: 36 },
  landingLogoBadge: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#eeeaff", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  landingTitle: { fontSize: 26, fontWeight: "900", color: "#1c1c1e", letterSpacing: -0.5, marginBottom: 8 },
  landingSubtitle: { fontSize: 13, color: "#8e8e93", textAlign: "center", lineHeight: 19, maxWidth: 280 },
  landingCard: { width: "100%", maxWidth: 360, gap: 12 },
  landingCardTitle: { fontSize: 16, fontWeight: "800", color: "#1c1c1e", textAlign: "center" },
  landingCardDesc: { fontSize: 12, color: "#8e8e93", textAlign: "center", lineHeight: 17, marginBottom: 8 },
  landingActionCard: { width: "100%", maxWidth: 360, gap: 12 },
  landingPrimaryBtn: { backgroundColor: "#7c69ef", borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  landingPrimaryBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  landingSecondaryBtn: { backgroundColor: "#f0eeff", borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  landingSecondaryBtnText: { color: "#7c69ef", fontSize: 13, fontWeight: "800" },
  appHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(124, 105, 239, 0.12)", alignItems: "center", justifyContent: "center" },
  appTitle: { fontSize: 16, fontWeight: "900", color: "#1c1c1e", letterSpacing: -0.5 },
  workspaceSubtitle: { fontSize: 11, color: "#8e8e93", fontWeight: "500" },
  profileAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#7c69ef", alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  activeChannelsBanner: { flexDirection: "row", gap: 8, marginBottom: 12 },
  activePill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(34, 197, 94, 0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 5 },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  activePillText: { fontSize: 10, color: "#16a34a", fontWeight: "700" },
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
  pendingCard: { backgroundColor: "#fff4e5", borderRadius: 12, padding: 10, marginBottom: 12 },
  pendingTitle: { fontSize: 12, fontWeight: "700", color: "#b45309" },
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
  taskCardCancelled: { backgroundColor: "#fff5f5", borderColor: "#fecaca" },
  taskTitle: { fontSize: 13, fontWeight: "700", color: "#1c1c1e", marginBottom: 2 },
  taskTitleDone: { textDecorationLine: "line-through", color: "#9ca3af" },
  taskTitleCancelled: { color: "#991b1b" },
  taskMeta: { fontSize: 10, color: "#6b7280" },
  pendingBadge: { backgroundColor: "rgba(234, 179, 8, 0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingBadgeText: { color: "#b45309", fontSize: 9, fontWeight: "700" },
  cancelledBadge: { backgroundColor: "rgba(239, 68, 68, 0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cancelledBadgeText: { color: "#dc2626", fontSize: 9, fontWeight: "700" },
  doneBadge: { backgroundColor: "rgba(34, 197, 94, 0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doneBadgeText: { color: "#16a34a", fontSize: 9, fontWeight: "700" },
  aiSummaryBadge: { backgroundColor: "rgba(124, 105, 239, 0.08)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "rgba(124, 105, 239, 0.2)" },
  aiSummaryBadgeText: { color: "#7c69ef", fontSize: 10, fontWeight: "600" },
  rejectionReasonText: { fontSize: 11, color: "#dc2626", marginTop: 4, fontWeight: "500", lineHeight: 15 },
  resolutionReasonText: { fontSize: 11, color: "#16a34a", marginTop: 4, fontWeight: "600", lineHeight: 15 },
  taskAcceptBtn: { backgroundColor: "#16a34a", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  taskAcceptBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  taskRejectBtn: { backgroundColor: "#ef4444", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  taskRejectBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(124, 105, 239, 0.1)" },
  toggleBtnActive: { backgroundColor: "rgba(34, 197, 94, 0.15)" },
  toggleBtnCancelled: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
  toggleText: { color: "#7c69ef", fontSize: 10, fontWeight: "700" },
  toggleTextActive: { color: "#16a34a" },
  toggleTextCancelled: { color: "#ef4444" },
});
