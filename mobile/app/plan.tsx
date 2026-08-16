import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  adminAddMember,
  adminRemoveMember,
  approveMember,
  getMembers,
  getPendingMembers,
  Member,
  rejectMember,
} from "../src/api";
import { AppIcon } from "../src/components/Icons";
import { BottomNav } from "../src/components/BottomNav";
import { useSession } from "../src/session";

export default function TeamManagementScreen() {
  const { user } = useSession();
  const [teamCode, setTeamCode] = useState(user?.team_code || "CASPIAN-2026");

  useEffect(() => {
    if (user?.team_code) {
      setTeamCode(user.team_code);
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<"members" | "pending">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Add Member Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [fMembers, fPending] = await Promise.allSettled([
        getMembers(teamCode),
        getPendingMembers(teamCode),
      ]);
      if (fMembers.status === "fulfilled") setMembers(fMembers.value);
      if (fPending.status === "fulfilled") setPendingMembers(fPending.value);
    } catch (err: any) {
      console.warn("Failed to load team data:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
    const interval = setInterval(() => {
      getPendingMembers(teamCode).then(setPendingMembers).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [teamCode]);

  const handleApprove = async (userId: number, name: string) => {
    setActionLoadingId(userId);
    try {
      await approveMember(userId, teamCode);
      Alert.alert("Approved", `${name} is now an active workspace member.`);
      loadTeamData();
    } catch (err: any) {
      Alert.alert("Approval Error", err.message || "Failed to approve member");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (userId: number, name: string) => {
    setActionLoadingId(userId);
    try {
      await rejectMember(userId, teamCode);
      Alert.alert("Rejected", `Join request for ${name} has been rejected.`);
      loadTeamData();
    } catch (err: any) {
      Alert.alert("Rejection Error", err.message || "Failed to reject member");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddMember = async () => {
    if (!newName.trim() || !newRole.trim()) {
      Alert.alert("Required Fields", "Please enter member name and role.");
      return;
    }
    setAddLoading(true);
    try {
      await adminAddMember({
        team_code: teamCode,
        name: newName.trim(),
        role: newRole.trim(),
        email: newEmail.trim() || undefined,
      });
      Alert.alert("Success", `${newName} was added to the workspace.`);
      setNewName("");
      setNewRole("");
      setNewEmail("");
      setAddModalVisible(false);
      loadTeamData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add member");
    } finally {
      setAddLoading(false);
    }
  };

  const isCurrentUserAdmin = user?.role?.toLowerCase().includes("admin") ?? false;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <AppIcon name="arrow-back" size={18} color="#1c1c1e" />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>
              {isCurrentUserAdmin ? "Team Directory & Approvals" : "Team Directory"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isCurrentUserAdmin ? "Manage workspace members and join requests" : "Active workspace members & skills"}
            </Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={loadTeamData}>
            <AppIcon name="refresh" size={18} color="#7c69ef" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Team Invite Code Banner */}
          <View style={styles.teamCodeCard}>
            <View>
              <Text style={styles.codeLabel}>WORKSPACE INVITE CODE</Text>
              <Text style={styles.codeVal}>{teamCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => Alert.alert("Invite Code", `Share this team code with coworkers: ${teamCode}`)}
            >
              <AppIcon name="copy" size={14} color="#7c69ef" />
              <Text style={styles.copyBtnText}>Copy Code</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Switcher (Admin Only) */}
          {isCurrentUserAdmin && (
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "members" && styles.tabBtnActive]}
                onPress={() => setActiveTab("members")}
              >
                <AppIcon name="user" size={14} color={activeTab === "members" ? "#7c69ef" : "#858397"} />
                <Text style={[styles.tabText, activeTab === "members" && styles.tabTextActive]}>
                  Active Members ({members.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "pending" && styles.tabBtnActive]}
                onPress={() => setActiveTab("pending")}
              >
                <AppIcon name="shield" size={14} color={activeTab === "pending" ? "#f59e0b" : "#858397"} />
                <Text style={[styles.tabText, activeTab === "pending" && { color: "#b45309", fontWeight: "800" }]}>
                  Pending ({pendingMembers.length})
                </Text>
                {pendingMembers.length > 0 && (
                  <View style={styles.badgeOrange}>
                    <Text style={styles.badgeOrangeText}>{pendingMembers.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Indicator */}
          {loading && (
            <ActivityIndicator color="#7c69ef" size="large" style={{ marginVertical: 24 }} />
          )}

          {/* PENDING APPROVALS LIST (Admin Only) */}
          {!loading && isCurrentUserAdmin && activeTab === "pending" && (
            <View>
              {pendingMembers.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Text style={{ fontSize: 24 }}>✨</Text>
                  </View>
                  <Text style={styles.emptyTitle}>No pending join requests</Text>
                  <Text style={styles.emptySub}>
                    When coworkers enter team code '{teamCode}', their requests appear here for approval.
                  </Text>
                </View>
              ) : (
                pendingMembers.map((m) => (
                  <View key={m.id} style={styles.pendingCard}>
                    <View style={styles.pendingTop}>
                      <View style={styles.avatarMini}>
                        <Text style={styles.avatarMiniText}>{m.name[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingName}>{m.name}</Text>
                        <Text style={styles.pendingRole}>{m.role}</Text>
                        {m.email && <Text style={styles.pendingEmail}>✉️ {m.email}</Text>}
                        {m.skills_description && (
                          <Text style={styles.pendingSkills}>Skills: {m.skills_description}</Text>
                        )}
                      </View>
                    </View>

                    {/* Approve & Reject Action Bar */}
                    <View style={styles.approvalActionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtnApprove, actionLoadingId === m.id && { opacity: 0.6 }]}
                        onPress={() => handleApprove(m.id, m.name)}
                        disabled={actionLoadingId === m.id}
                      >
                        {actionLoadingId === m.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Text style={styles.btnApproveText}>✓ Approve Member</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtnReject, actionLoadingId === m.id && { opacity: 0.6 }]}
                        onPress={() => handleReject(m.id, m.name)}
                        disabled={actionLoadingId === m.id}
                      >
                        <Text style={styles.btnRejectText}>✕ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ACTIVE MEMBERS LIST */}
          {!loading && (!isCurrentUserAdmin || activeTab === "members") && (
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={styles.sectionHeading}>Team Roster ({members.length})</Text>
                {isCurrentUserAdmin && (
                  <TouchableOpacity
                    style={styles.addMemberTrigger}
                    onPress={() => setAddModalVisible(true)}
                  >
                    <AppIcon name="add" size={14} color="#7c69ef" />
                    <Text style={styles.addMemberText}>Add Member</Text>
                  </TouchableOpacity>
                )}
              </View>

              {members.map((m) => {
                const isAdmin = m.role.toLowerCase().includes("lead") || m.role.toLowerCase().includes("admin");
                return (
                  <View key={m.id} style={styles.memberCard}>
                    <View style={styles.avatarMain}>
                      <Text style={styles.avatarMainText}>{m.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <View style={[styles.roleBadge, isAdmin ? styles.roleAdmin : styles.roleRegular]}>
                          <Text style={[styles.roleBadgeText, isAdmin ? styles.roleAdminText : styles.roleRegularText]}>
                            {m.role}
                          </Text>
                        </View>
                      </View>
                      {m.email && <Text style={styles.memberSub}>✉️ {m.email}</Text>}
                      {m.contact && <Text style={styles.memberSub}>📞 {m.contact}</Text>}
                      {m.skills_description && (
                        <Text style={styles.skillsTag}>Skills: {m.skills_description}</Text>
                      )}
                    </View>
                    <View style={styles.activeDotBadge}>
                      <View style={styles.greenDot} />
                      <Text style={styles.greenDotText}>Active</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Solid Bottom Navigation Bar */}
        <BottomNav activeTab="team" />

        {/* Add Member Modal */}
        <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Team Member</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <AppIcon name="close" size={18} color="#9aa5b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Maya Chen"
                  value={newName}
                  onChangeText={setNewName}
                />

                <Text style={styles.inputLabel}>ROLE / SPECIALTY *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. DevOps Engineer / AWS"
                  value={newRole}
                  onChangeText={setNewRole}
                />

                <Text style={styles.inputLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. maya@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newEmail}
                  onChangeText={setNewEmail}
                />

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, addLoading && { opacity: 0.6 }]}
                  onPress={handleAddMember}
                  disabled={addLoading}
                >
                  {addLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Add to Team</Text>
                  )}
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
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ececf2",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f7f8fc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#8e8e93",
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  teamCodeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ececf2",
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#858397",
    marginBottom: 2,
  },
  codeVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#7c69ef",
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3f0ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8d0ff",
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7c69ef",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#ececf2",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 7,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#858397",
  },
  tabTextActive: {
    color: "#7c69ef",
    fontWeight: "800",
  },
  badgeOrange: {
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeOrangeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  addMemberTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8d0ff",
  },
  addMemberText: {
    color: "#7c69ef",
    fontSize: 11,
    fontWeight: "700",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#ececf2",
  },
  avatarMain: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eeeaff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMainText: {
    color: "#7c69ef",
    fontSize: 16,
    fontWeight: "800",
  },
  memberName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  memberSub: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 1,
  },
  skillsTag: {
    fontSize: 9,
    color: "#7c69ef",
    marginTop: 3,
    fontWeight: "600",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  roleAdmin: {
    backgroundColor: "#eeeaff",
  },
  roleAdminText: {
    color: "#7c69ef",
    fontSize: 9,
    fontWeight: "700",
  },
  roleRegular: {
    backgroundColor: "#f1f1f5",
  },
  roleRegularText: {
    color: "#6b7280",
    fontSize: 9,
    fontWeight: "700",
  },
  activeDotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  greenDotText: {
    color: "#15803d",
    fontSize: 9,
    fontWeight: "700",
  },
  pendingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
    shadowColor: "#f59e0b",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pendingTop: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: {
    color: "#b45309",
    fontSize: 14,
    fontWeight: "800",
  },
  pendingName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  pendingRole: {
    fontSize: 11,
    color: "#b45309",
    fontWeight: "600",
    marginTop: 1,
  },
  pendingEmail: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  pendingSkills: {
    fontSize: 10,
    color: "#7c69ef",
    marginTop: 2,
  },
  approvalActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnApprove: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  btnApproveText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  actionBtnReject: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnRejectText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 30,
    borderWidth: 1,
    borderColor: "#ececf2",
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1c1c1e",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 22, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1c1c1e",
  },
  modalBody: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#858397",
    marginTop: 8,
    marginBottom: 2,
  },
  modalInput: {
    backgroundColor: "#f7f8fc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  modalSubmitBtn: {
    backgroundColor: "#7c69ef",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
