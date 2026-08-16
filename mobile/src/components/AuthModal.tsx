import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  adminLogin,
  adminSendOtp,
  adminSignup,
  adminVerifyOtp,
  memberLogin,
  submitJoinRequest,
  UserAuth,
} from "../api";
import { AppIcon } from "./Icons";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: UserAuth) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const [portalType, setPortalType] = useState<"admin" | "member">("admin");

  // Admin State
  const [adminMode, setAdminMode] = useState<"login" | "otp" | "signup">("login");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Member State
  const [memberMode, setMemberMode] = useState<"join" | "login">("join");
  const [teamCode, setTeamCode] = useState("CASPIAN-2026");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberContact, setMemberContact] = useState("");
  const [memberSkills, setMemberSkills] = useState("");

  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Poll for approval if waiting
  useEffect(() => {
    let interval: any = null;
    if (waitingForApproval && memberName.trim() && visible) {
      interval = setInterval(async () => {
        try {
          const user = await memberLogin(memberName.trim(), teamCode.trim());
          if (user && user.user_id) {
            clearInterval(interval);
            setWaitingForApproval(false);
            setSuccessMsg(`🎉 Approved! Welcome to ${user.team_name}, ${user.name}!`);
            setTimeout(() => {
              onSuccess(user);
              onClose();
            }, 900);
          }
        } catch {
          // still pending
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [waitingForApproval, memberName, teamCode, visible, onSuccess, onClose]);

  // Admin Login
  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      const user = await adminLogin({
        email: adminEmail.trim(),
        password: adminPassword.trim(),
      });
      setSuccessMsg(`Welcome back, ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  // Admin Send OTP
  const handleSendOtp = async () => {
    if (!adminEmail.trim()) {
      setErrorMsg("Please enter your admin email.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      await adminSendOtp(adminEmail.trim());
      setOtpSent(true);
      setSuccessMsg("6-digit verification code sent to your email.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Admin Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setErrorMsg("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      const user = await adminVerifyOtp({
        email: adminEmail.trim(),
        token_code: otpCode.trim(),
      });
      setSuccessMsg(`Verified! Welcome ${user.name}.`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  // Admin Signup
  const handleAdminSignup = async () => {
    if (!adminEmail.trim() || !adminPassword.trim() || !adminName.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      const user = await adminSignup({
        email: adminEmail.trim(),
        password: adminPassword.trim(),
        name: adminName.trim(),
        workspace_name: workspaceName.trim() || undefined,
      });
      setSuccessMsg(`Workspace created! Welcome ${user.name}.`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create workspace.");
    } finally {
      setLoading(false);
    }
  };

  // Member Submit Join Request
  const handleMemberJoin = async () => {
    if (!teamCode.trim() || !memberName.trim() || !memberEmail.trim() || !memberRole.trim()) {
      setErrorMsg("Please fill in Team Code, Full Name, Email, and Role.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      await submitJoinRequest({
        team_code: teamCode.trim(),
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole.trim(),
        contact: memberContact.trim() || undefined,
        skills_description: memberSkills.trim() || undefined,
      });
      setWaitingForApproval(true);
      setSuccessMsg("Join request submitted! Waiting for workspace admin approval...");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit join request.");
    } finally {
      setLoading(false);
    }
  };

  // Member Login (for approved members)
  const handleMemberLogin = async () => {
    if (!memberName.trim()) {
      setErrorMsg("Please enter your name or email.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      const user = await memberLogin(memberName.trim(), teamCode.trim() || undefined);
      setSuccessMsg(`Welcome ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("pending") || err.message?.toLowerCase().includes("approval")) {
        setWaitingForApproval(true);
        setSuccessMsg("Your request is still pending approval from the admin.");
      } else {
        setErrorMsg(err.message || "Member login failed. If you haven't joined yet, please use 'Join Workspace'.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Caspian TeamOps</Text>
              <Text style={styles.subtitle}>Workspace Authentication & Onboarding</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" size={18} color="#9aa5b8" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Top Portal Switcher */}
            <View style={styles.portalTabs}>
              <TouchableOpacity
                style={[styles.portalTab, portalType === "admin" && styles.portalTabActive]}
                onPress={() => {
                  setPortalType("admin");
                  clearMessages();
                  setWaitingForApproval(false);
                }}
              >
                <AppIcon name="shield" size={14} color={portalType === "admin" ? "#7c69ef" : "#858397"} />
                <Text style={[styles.portalTabText, portalType === "admin" && styles.portalTabTextActive]}>
                  Admin / Lead
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.portalTab, portalType === "member" && styles.portalTabActive]}
                onPress={() => {
                  setPortalType("member");
                  clearMessages();
                }}
              >
                <AppIcon name="user" size={14} color={portalType === "member" ? "#7c69ef" : "#858397"} />
                <Text style={[styles.portalTabText, portalType === "member" && styles.portalTabTextActive]}>
                  Team Member
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error / Success Notifications */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            {/* ================= ADMIN PORTAL ================= */}
            {portalType === "admin" && (
              <View>
                {/* Admin Mode Switcher */}
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeBtn, adminMode === "login" && styles.modeBtnActive]}
                    onPress={() => {
                      setAdminMode("login");
                      clearMessages();
                    }}
                  >
                    <Text style={[styles.modeText, adminMode === "login" && styles.modeTextActive]}>Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, adminMode === "otp" && styles.modeBtnActive]}
                    onPress={() => {
                      setAdminMode("otp");
                      clearMessages();
                    }}
                  >
                    <Text style={[styles.modeText, adminMode === "otp" && styles.modeTextActive]}>Email OTP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, adminMode === "signup" && styles.modeBtnActive]}
                    onPress={() => {
                      setAdminMode("signup");
                      clearMessages();
                    }}
                  >
                    <Text style={[styles.modeText, adminMode === "signup" && styles.modeTextActive]}>Create Team</Text>
                  </TouchableOpacity>
                </View>

                {adminMode === "login" && (
                  <View style={styles.form}>
                    <Text style={styles.label}>ADMIN EMAIL *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="admin@company.com"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text style={styles.label}>PASSWORD *</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="••••••••"
                        secureTextEntry={!showPassword}
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <AppIcon name={showPassword ? "eye-off" : "eye"} size={16} color="#858397" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                      onPress={handleAdminLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Sign In as Admin</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {adminMode === "otp" && (
                  <View style={styles.form}>
                    <Text style={styles.label}>ADMIN EMAIL *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="admin@company.com"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!otpSent}
                    />

                    {otpSent && (
                      <>
                        <Text style={styles.label}>6-DIGIT VERIFICATION CODE *</Text>
                        <TextInput
                          style={[styles.input, { letterSpacing: 4, fontSize: 18, fontWeight: "700" }]}
                          placeholder="123456"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otpCode}
                          onChangeText={setOtpCode}
                        />
                      </>
                    )}

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                      onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          {otpSent ? "Verify Code & Sign In" : "Send 6-Digit OTP"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {adminMode === "signup" && (
                  <View style={styles.form}>
                    <Text style={styles.label}>ADMIN FULL NAME *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Ali Reza"
                      value={adminName}
                      onChangeText={setAdminName}
                    />

                    <Text style={styles.label}>WORKSPACE NAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Acme Engineering"
                      value={workspaceName}
                      onChangeText={setWorkspaceName}
                    />

                    <Text style={styles.label}>EMAIL ADDRESS *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ali@acme.com"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text style={styles.label}>PASSWORD *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="At least 6 characters"
                      secureTextEntry={!showPassword}
                      value={adminPassword}
                      onChangeText={setAdminPassword}
                    />

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                      onPress={handleAdminSignup}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Create Workspace & Admin</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ================= TEAM MEMBER PORTAL ================= */}
            {portalType === "member" && (
              <View>
                {/* Mode Selector */}
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeBtn, memberMode === "join" && styles.modeBtnActive]}
                    onPress={() => {
                      setMemberMode("join");
                      clearMessages();
                      setWaitingForApproval(false);
                    }}
                  >
                    <Text style={[styles.modeText, memberMode === "join" && styles.modeTextActive]}>
                      Join with Team Code
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, memberMode === "login" && styles.modeBtnActive]}
                    onPress={() => {
                      setMemberMode("login");
                      clearMessages();
                      setWaitingForApproval(false);
                    }}
                  >
                    <Text style={[styles.modeText, memberMode === "login" && styles.modeTextActive]}>
                      Member Sign In
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Waiting Approval Card */}
                {waitingForApproval ? (
                  <View style={styles.waitingCard}>
                    <ActivityIndicator size="large" color="#f59e0b" style={{ marginBottom: 12 }} />
                    <Text style={styles.waitingTitle}>Awaiting Admin Approval</Text>
                    <Text style={styles.waitingSub}>
                      Your request has been delivered to the workspace admin. This screen will automatically open as soon as you are approved.
                    </Text>
                    <TouchableOpacity
                      style={styles.cancelWaitBtn}
                      onPress={() => setWaitingForApproval(false)}
                    >
                      <Text style={styles.cancelWaitText}>Cancel / Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                ) : memberMode === "join" ? (
                  /* Comprehensive Employee Join Form */
                  <View style={styles.form}>
                    <Text style={styles.label}>WORKSPACE INVITE CODE *</Text>
                    <TextInput
                      style={[styles.input, { letterSpacing: 1, fontWeight: "700", color: "#7c69ef" }]}
                      placeholder="e.g. CASPIAN-2026"
                      autoCapitalize="characters"
                      value={teamCode}
                      onChangeText={setTeamCode}
                    />

                    <Text style={styles.label}>YOUR FULL NAME *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rahul Sharma"
                      value={memberName}
                      onChangeText={setMemberName}
                    />

                    <Text style={styles.label}>YOUR WORK EMAIL *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="rahul@company.com"
                      value={memberEmail}
                      onChangeText={setMemberEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text style={styles.label}>ROLE / SPECIALTY *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Backend Engineer (FastAPI & PostgreSQL)"
                      value={memberRole}
                      onChangeText={setMemberRole}
                    />

                    <Text style={styles.label}>CONTACT PHONE (OPTIONAL)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+1 (555) 000-0000"
                      value={memberContact}
                      onChangeText={setMemberContact}
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>SKILLS & SUMMARY (OPTIONAL)</Text>
                    <TextInput
                      style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                      placeholder="e.g. Python, Docker, API design, UI testing"
                      multiline
                      value={memberSkills}
                      onChangeText={setMemberSkills}
                    />

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                      onPress={handleMemberJoin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Submit Join Request</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Simple Member Sign In */
                  <View style={styles.form}>
                    <Text style={styles.label}>WORKSPACE INVITE CODE</Text>
                    <TextInput
                      style={[styles.input, { letterSpacing: 1, fontWeight: "700", color: "#7c69ef" }]}
                      placeholder="e.g. CASPIAN-2026"
                      autoCapitalize="characters"
                      value={teamCode}
                      onChangeText={setTeamCode}
                    />

                    <Text style={styles.label}>MEMBER NAME OR EMAIL *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rahul or rahul@company.com"
                      value={memberName}
                      onChangeText={setMemberName}
                    />

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                      onPress={handleMemberLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Sign In to Workspace</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "90%",
    paddingBottom: 20,
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
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#181829",
  },
  subtitle: {
    fontSize: 11,
    color: "#858397",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  portalTabs: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  portalTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  portalTabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  portalTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#858397",
  },
  portalTabTextActive: {
    color: "#7c69ef",
    fontWeight: "800",
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modeText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  modeTextActive: {
    color: "#111827",
    fontWeight: "800",
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 3,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#111827",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  submitBtn: {
    backgroundColor: "#7c69ef",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "600",
  },
  successBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  successText: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "700",
  },
  waitingCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
    marginVertical: 10,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 6,
  },
  waitingSub: {
    fontSize: 11,
    color: "#b45309",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
  },
  cancelWaitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  cancelWaitText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "700",
  },
});
