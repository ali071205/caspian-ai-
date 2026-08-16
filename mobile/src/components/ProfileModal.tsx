import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Connection, getConnections, oneClickEmail, oneClickSlack, UserAuth } from "../api";
import { AppIcon } from "./Icons";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserAuth | null;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
  onLogout,
}) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getConnections();
      setConnections(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
      setNotice(null);
    }
  }, [visible]);

  const handleSlackOneClick = async () => {
    setActionLoading("slack");
    setNotice(null);
    try {
      const result = await oneClickSlack();
      if (result.setup_url) {
        setNotice("Launching Slack 1-Click authorization window...");
        Linking.openURL(result.setup_url).catch(() => {});
      } else {
        setNotice(result.detail || "Slack connection initialized.");
      }
      loadData();
    } catch (err: any) {
      setNotice(`Slack connect notice: ${err?.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmailOneClick = async () => {
    setActionLoading("email");
    setNotice(null);
    try {
      const result = await oneClickEmail();
      setNotice(result.detail || "Inbound email active and routed to TeamOps.");
      loadData();
    } catch (err: any) {
      setNotice(`Email connect notice: ${err?.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const slackConn = connections.find((c) => c.channel === "slack");
  const emailConn = connections.find((c) => c.channel === "email");
  const isSlackActive = slackConn?.status === "active";
  const isEmailActive = emailConn?.status === "active";
  const isAdmin = currentUser?.role?.toLowerCase().includes("admin") ?? false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <AppIcon name="user" size={18} color="#7c69ef" />
              </View>
              <View>
                <Text style={styles.title}>Account & Workspace</Text>
                <Text style={styles.subTitle}>Configuration and multi-channel links</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" size={18} color="#9aa5b8" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* User Info Block */}
            <View style={styles.userCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Text style={styles.userNameText}>{currentUser?.name || "Guest User"}</Text>
                  <View style={[styles.rolePill, isAdmin ? styles.roleAdmin : styles.roleMember]}>
                    <Text style={[styles.roleText, isAdmin ? styles.roleAdminText : styles.roleMemberText]}>
                      {isAdmin ? "Admin" : "Member"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userRoleSub}>{currentUser?.role || "Team Contributor"}</Text>
                {currentUser?.email && <Text style={styles.userEmailText}>{currentUser.email}</Text>}
              </View>
            </View>

            {/* Workspace & Team Code Card */}
            {currentUser && (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionHeader}>🏢 Team Workspace</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>WORKSPACE</Text>
                  <Text style={styles.infoValue}>{currentUser.team_name || "Caspian Sentinel Team"}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View>
                    <Text style={styles.infoLabel}>TEAM INVITE CODE</Text>
                    <Text style={styles.codeValue}>{currentUser.team_code || "CASPIAN-2026"}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => Alert.alert("Invite Code", `Share this team code with coworkers to join: ${currentUser.team_code}`)}
                  >
                    <AppIcon name="copy" size={14} color="#7c69ef" />
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Multi-Channel Integrations (Admin Only) */}
            {isAdmin && (
              <View style={styles.sectionBox}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={styles.sectionHeader}>⚡ Admin Channel Integrations</Text>
                  {loading && <ActivityIndicator size="small" color="#7c69ef" />}
                </View>

                {/* Slack Card */}
                <View style={[styles.channelItem, isSlackActive && styles.channelItemActive]}>
                  <View style={styles.channelHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <AppIcon name="shield" size={16} color={isSlackActive ? "#22c55e" : "#7c69ef"} />
                      <Text style={styles.channelName}>Slack Workspace</Text>
                    </View>
                    <View style={[styles.statusBadge, isSlackActive ? styles.statusActive : styles.statusPending]}>
                      <View style={[styles.statusDot, isSlackActive ? styles.dotActive : styles.dotPending]} />
                      <Text style={[styles.statusBadgeText, isSlackActive ? styles.textActive : styles.textPending]}>
                        {isSlackActive ? "Connected" : "Disconnected"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.channelDetailText}>
                    {slackConn?.detail || "Connect your Slack workspace for automated bot signals and task creation."}
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, isSlackActive ? styles.actionBtnSecondary : styles.actionBtnPrimary]}
                    onPress={handleSlackOneClick}
                    disabled={actionLoading === "slack"}
                  >
                    {actionLoading === "slack" ? (
                      <ActivityIndicator size="small" color={isSlackActive ? "#7c69ef" : "#fff"} />
                    ) : (
                      <Text style={[styles.actionBtnText, isSlackActive ? styles.actionBtnTextSec : styles.actionBtnTextPri]}>
                        {isSlackActive ? "Reconnect / Change Slack" : "1-Click Add to Slack"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Email Card */}
                <View style={[styles.channelItem, isEmailActive && styles.channelItemActive]}>
                  <View style={styles.channelHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <AppIcon name="send" size={16} color={isEmailActive ? "#22c55e" : "#7c69ef"} />
                      <Text style={styles.channelName}>Inbound Email Mailbox</Text>
                    </View>
                    <View style={[styles.statusBadge, isEmailActive ? styles.statusActive : styles.statusPending]}>
                      <View style={[styles.statusDot, isEmailActive ? styles.dotActive : styles.dotPending]} />
                      <Text style={[styles.statusBadgeText, isEmailActive ? styles.textActive : styles.textPending]}>
                        {isEmailActive ? "Active" : "Ready"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.channelDetailText}>
                    {emailConn?.detail || "Inbound mailbox for incident emails, GitHub CI reports, and Render outages."}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1 }, isEmailActive ? styles.actionBtnSecondary : styles.actionBtnPrimary]}
                      onPress={handleEmailOneClick}
                      disabled={actionLoading === "email"}
                    >
                      {actionLoading === "email" ? (
                        <ActivityIndicator size="small" color={isEmailActive ? "#7c69ef" : "#fff"} />
                      ) : (
                        <Text style={[styles.actionBtnText, isEmailActive ? styles.actionBtnTextSec : styles.actionBtnTextPri]}>
                          {isEmailActive ? "Re-provision Inbox" : "1-Click Connect Email"}
                        </Text>
                      )}
                    </TouchableOpacity>
                    {isEmailActive && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnSecondary, { paddingHorizontal: 12 }]}
                        onPress={() => Alert.alert("Email Address", `Inbound email address:\nsentinel-teamops@agents.trycaspianai.com`)}
                      >
                        <AppIcon name="copy" size={14} color="#7c69ef" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {notice && (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>ℹ️ {notice}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Logout Action */}
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <AppIcon name="login" size={16} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Sign Out / Switch Workspace</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 22, 0.72)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f5",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eeeaff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#181829",
  },
  subTitle: {
    fontSize: 11,
    color: "#858397",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#ececf2",
  },
  avatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7c69ef",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  userNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#181829",
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleAdmin: {
    backgroundColor: "#eeeaff",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
  },
  roleAdminText: {
    color: "#7c69ef",
    fontSize: 10,
    fontWeight: "800",
  },
  roleMember: {
    backgroundColor: "#f1f1f5",
  },
  roleMemberText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
  },
  userRoleSub: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  userEmailText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  codeValue: {
    fontSize: 14,
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
  channelItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  channelItemActive: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  channelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  channelName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  statusPending: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#22c55e",
  },
  dotPending: {
    backgroundColor: "#f59e0b",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textActive: {
    color: "#15803d",
  },
  textPending: {
    color: "#b45309",
  },
  channelDetailText: {
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 16,
    marginBottom: 10,
  },
  actionBtn: {
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    backgroundColor: "#7c69ef",
  },
  actionBtnSecondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnTextPri: {
    color: "#ffffff",
  },
  actionBtnTextSec: {
    color: "#4b5563",
  },
  noticeBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  noticeText: {
    fontSize: 11,
    color: "#1d4ed8",
    lineHeight: 16,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "700",
  },
});
