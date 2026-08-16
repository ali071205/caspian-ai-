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
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../src/theme";
import { membersData } from "../src/data";
import { 
  getTasks, 
  getMembers, 
  getPendingMembers, 
  approveMember, 
  rejectMember, 
  getTeamCode, 
  sendChat,
  Task, 
  Member, 
  UserAuth 
} from "../src/api";
import { AuthModal } from "../src/components/AuthModal";

export default function HomeScreen() {
  const [currentUser, setCurrentUser] = useState<UserAuth>({
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
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedTasks, fetchedMembers, fetchedPending, fetchedCode] = await Promise.allSettled([
        getTasks(),
        getMembers(),
        getPendingMembers(),
        getTeamCode(),
      ]);

      if (fetchedTasks.status === "fulfilled") setTasks(fetchedTasks.value);
      if (fetchedMembers.status === "fulfilled") setMembers(fetchedMembers.value);
      if (fetchedPending.status === "fulfilled") setPendingMembers(fetchedPending.value);
      if (fetchedCode.status === "fulfilled") setTeamCode(fetchedCode.value.team_code);
    } catch (err) {
      console.warn("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApprove = async (userId: number, name: string) => {
    try {
      await approveMember(userId);
      Alert.alert("Approved", `${name} is now an active team member!`);
      loadDashboardData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to approve member");
    }
  };

  const handleReject = async (userId: number, name: string) => {
    try {
      await rejectMember(userId);
      Alert.alert("Rejected", `Join request for ${name} was rejected.`);
      loadDashboardData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reject member");
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const res = await sendChat(chatInput.trim(), currentUser.name);
      setChatResponse(res.reply);
      setChatInput("");
      loadDashboardData();
    } catch (err: any) {
      Alert.alert("Sentinel AI Error", err.message || "Failed to send command");
    } finally {
      setChatLoading(false);
    }
  };

  const activeTaskCount = tasks.filter(t => t.status !== "DONE" && t.status !== "CANCELLED").length;
  const displayTasks = tasks.length > 0 ? tasks : [
    { id: 1, title: "Healthcare Dashboard UI", description: "Design Team", owner_id: 1, deadline: "2026-08-20T18:00:00", status: "IN_PROGRESS" as const, at_risk: false }
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
              style={styles.profileRow}
              onPress={() => setAuthModalVisible(true)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: membersData[0].avatar }}
                style={styles.avatarMain}
              />
              <View>
                <Text style={styles.greetingText}>Good Morning !</Text>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{currentUser.name}</Text>
                  <Text style={styles.roleBadge}>{currentUser.role?.includes("Admin") ? "Admin" : "Member"}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              <TouchableOpacity 
                style={styles.authBtn} 
                onPress={() => setAuthModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.authBtnText}>🔑 Auth</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.bellBtn} 
                onPress={loadDashboardData}
                activeOpacity={0.7}
              >
                <Text style={styles.bellIcon}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Team Code Bar */}
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

          {/* Pending Approvals Queue (Admin only) */}
          {pendingMembers.length > 0 && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Text style={styles.pendingTitle}>⏳ Pending Approvals ({pendingMembers.length})</Text>
                <Text style={styles.pendingSub}>1-Tap to activate employee</Text>
              </View>
              {pendingMembers.map((m) => (
                <View key={m.id} style={styles.pendingMemberRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingMemberName}>{m.name}</Text>
                    <Text style={styles.pendingMemberRole}>{m.role} · {m.contact || m.email}</Text>
                    {m.skills_description ? (
                      <Text style={styles.pendingMemberSkills}>Skills: {m.skills_description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity 
                      style={styles.approveBtn}
                      onPress={() => handleApprove(m.id, m.name)}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.rejectBtn}
                      onPress={() => handleReject(m.id, m.name)}
                    >
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Hero Title */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleLight}>You have {activeTaskCount}</Text>
            <Text style={styles.heroTitleBold}>tasks in pipeline</Text>
          </View>

          {/* Members Section */}
          <View style={styles.membersSection}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>{members.length || 8} Active Members</Text>
              <TouchableOpacity 
                style={styles.addMemberBtn} 
                activeOpacity={0.7}
                onPress={() => setAuthModalVisible(true)}
              >
                <Text style={styles.addMemberPlus}>+</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.membersScroll}
            >
              {(members.length > 0 ? members : membersData).map((member, idx) => (
                <View key={member.id || idx} style={styles.memberAvatarContainer}>
                  <Image
                    source={{ uri: (membersData[idx % membersData.length] || membersData[0]).avatar }}
                    style={styles.memberAvatar}
                  />
                  <Text style={styles.memberAvatarName} numberOfLines={1}>
                    {member.name.split(" ")[0]}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Sentinel AI Commander Bar */}
          <View style={styles.sentinelBox}>
            <Text style={styles.sentinelTitle}>🤖 Caspian Sentinel AI Dispatcher</Text>
            <Text style={styles.sentinelSub}>Type task or directive (e.g. 'Rahul, fix AWS 500 error by Thursday')</Text>
            <View style={styles.sentinelInputRow}>
              <TextInput
                style={styles.sentinelInput}
                placeholder="Give task or query Sentinel..."
                placeholderTextColor="#777"
                value={chatInput}
                onChangeText={setChatInput}
              />
              <TouchableOpacity 
                style={styles.sentinelSendBtn} 
                onPress={handleSendChat}
                disabled={chatLoading}
              >
                {chatLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sentinelSendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
            {chatResponse ? (
              <View style={styles.chatResponseBox}>
                <Text style={styles.chatResponseText}>{chatResponse}</Text>
              </View>
            ) : null}
          </View>

          {/* Next Task Section */}
          <View style={styles.nextTaskSection}>
            <Text style={styles.nextTaskHeading}>Live Active Tasks</Text>

            {displayTasks.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() => router.push("/plan")}
              >
                <View style={styles.heroCardHeader}>
                  <Text style={styles.heroCardTitle}>{item.title}</Text>
                  <Text style={styles.heroCardSubtitle}>
                    Status: {item.status} · Due: {item.deadline ? new Date(item.deadline).toLocaleDateString() : "Flexible"}
                  </Text>
                </View>

                <View style={styles.illustrationArea}>
                  <View style={styles.isometricBox}>
                    <Text style={styles.sparkleIcon}>⚡</Text>
                  </View>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{item.at_risk ? "⚠️ AT RISK" : "🛡️ TRACKED"}</Text>
                  </View>
                </View>

                <View style={styles.heroCardFooter}>
                  <Text style={styles.readMoreText}>View Complete Plan</Text>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrowText}>↗</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Text style={styles.navIcon}>🏠</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/calendar")}
          >
            <Text style={styles.navIcon}>📅</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/plan")}
          >
            <Text style={styles.navIcon}>📋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setAuthModalVisible(true)}
          >
            <Text style={styles.navIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Auth & Onboarding Modal */}
        <AuthModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            loadDashboardData();
          }}
        />
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
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarMain: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#eee",
  },
  greetingText: {
    fontSize: 12,
    color: "#8e8e93",
    fontWeight: "500",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "rgba(124, 105, 239, 0.15)",
    color: "#7c69ef",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authBtn: {
    backgroundColor: "#7c69ef",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  authBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  bellIcon: {
    fontSize: 14,
  },
  teamCodeBanner: {
    backgroundColor: "#1c1b35",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  teamCodeLabel: {
    color: "#a797ff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  teamCodeVal: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  shareBtn: {
    backgroundColor: "#7c69ef",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingCard: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  pendingHeader: {
    marginBottom: 10,
  },
  pendingTitle: {
    color: "#b45309",
    fontSize: 14,
    fontWeight: "700",
  },
  pendingSub: {
    color: "#78350f",
    fontSize: 11,
  },
  pendingMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  pendingMemberName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  pendingMemberRole: {
    fontSize: 11,
    color: "#666",
  },
  pendingMemberSkills: {
    fontSize: 10,
    color: "#7c69ef",
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 6,
  },
  approveBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  rejectBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitleContainer: {
    marginBottom: 18,
  },
  heroTitleLight: {
    fontSize: 28,
    fontWeight: "300",
    color: "#1c1c1e",
  },
  heroTitleBold: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1c1c1e",
    marginTop: -4,
  },
  membersSection: {
    marginBottom: 20,
  },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  membersTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1c1e",
  },
  addMemberBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  addMemberPlus: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1c1c1e",
  },
  membersScroll: {
    paddingVertical: 4,
    gap: 12,
  },
  memberAvatarContainer: {
    alignItems: "center",
    width: 50,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e5e5ea",
  },
  memberAvatarName: {
    fontSize: 10,
    color: "#555",
    marginTop: 4,
  },
  sentinelBox: {
    backgroundColor: "#161824",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  sentinelTitle: {
    color: "#a797ff",
    fontSize: 13,
    fontWeight: "700",
  },
  sentinelSub: {
    color: "#9aa5b8",
    fontSize: 11,
    marginBottom: 10,
  },
  sentinelInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  sentinelInput: {
    flex: 1,
    backgroundColor: "#0e1017",
    borderWidth: 1,
    borderColor: "#2d3142",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  sentinelSendBtn: {
    backgroundColor: "#7c69ef",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sentinelSendText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  chatResponseBox: {
    backgroundColor: "#212433",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  chatResponseText: {
    color: "#4ade80",
    fontSize: 11,
    lineHeight: 16,
  },
  nextTaskSection: {
    marginBottom: 20,
  },
  nextTaskHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1c1c1e",
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: "#b49bfa",
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#7c69ef",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCardHeader: {
    marginBottom: 12,
  },
  heroCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  heroCardSubtitle: {
    fontSize: 12,
    color: "rgba(28, 28, 30, 0.7)",
    fontWeight: "600",
    marginTop: 2,
  },
  illustrationArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  isometricBox: {
    width: 44,
    height: 44,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleIcon: {
    fontSize: 20,
  },
  tagBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  heroCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1c1e",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
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
