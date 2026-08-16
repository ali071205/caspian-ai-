import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  adminLogin,
  adminSendOtp,
  adminVerifyOtp,
  adminSignup,
  memberLogin,
  verifyTeamCode,
  submitJoinRequest,
  UserAuth,
} from "../api";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: UserAuth) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<"admin" | "member">("admin");

  // Admin state
  const [adminMode, setAdminMode] = useState<"login" | "otp" | "signup">("login");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("Ali");
  const [workspaceName, setWorkspaceName] = useState("Caspian Sentinel Team");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Member state
  const [memberMode, setMemberMode] = useState<"login" | "join">("login");
  const [memberName, setMemberName] = useState("");
  const [teamCode, setTeamCode] = useState("CASPIAN-2026");
  const [teamVerified, setTeamVerified] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberContact, setMemberContact] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberSkills, setMemberSkills] = useState("");

  // Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // ================= ADMIN HANDLERS =================
  const handleAdminPasswordLogin = async () => {
    setLoading(true);
    resetMessages();
    try {
      const user = await adminLogin({
        email: adminEmail.trim() || "ali@company.com",
        password: adminPassword || "admin123",
      });
      setSuccessMsg(`Welcome Admin ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!adminEmail.trim()) {
      setErrorMsg("Please enter your admin email.");
      return;
    }
    setLoading(true);
    resetMessages();
    try {
      const res = await adminSendOtp(adminEmail.trim());
      setOtpSent(true);
      setSuccessMsg(res.message || "Verification code sent to your inbox!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch email code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    resetMessages();
    try {
      const user = await adminVerifyOtp({
        email: adminEmail.trim(),
        token_code: otpCode.trim(),
      });
      setSuccessMsg(`Verified! Welcome Admin ${user.name}.`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async () => {
    setLoading(true);
    resetMessages();
    try {
      const user = await adminSignup({
        email: adminEmail.trim(),
        password: adminPassword,
        name: adminName.trim(),
        workspace_name: workspaceName.trim(),
      });
      setSuccessMsg(`Workspace created! Team Code: ${user.team_code}`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  // ================= MEMBER HANDLERS =================
  const handleMemberLogin = async () => {
    if (!memberName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    setLoading(true);
    resetMessages();
    try {
      const user = await memberLogin(memberName.trim());
      setSuccessMsg(`Welcome ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || "Member login error.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!teamCode.trim()) {
      setErrorMsg("Please enter a team code.");
      return;
    }
    setLoading(true);
    resetMessages();
    try {
      const res = await verifyTeamCode(teamCode.trim().toUpperCase());
      setTeamVerified(true);
      setSuccessMsg(`Code Verified: ${res.team_name}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid team code.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async () => {
    if (!memberName.trim() || !memberEmail.trim() || !memberRole.trim()) {
      setErrorMsg("Please fill in Name, Email, and Role.");
      return;
    }
    setLoading(true);
    resetMessages();
    try {
      const res = await submitJoinRequest({
        team_code: teamCode.trim().toUpperCase(),
        name: memberName.trim(),
        email: memberEmail.trim(),
        contact: memberContact.trim(),
        role: memberRole.trim(),
        skills_description: memberSkills.trim(),
      });
      setSuccessMsg(res.message || "Join request submitted! Awaiting Admin approval.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit join request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🛡️ Caspian Sentinel Gateway</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "admin" && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab("admin");
                resetMessages();
              }}
            >
              <Text style={[styles.tabText, activeTab === "admin" && styles.tabTextActive]}>
                👑 Admin Portal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "member" && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab("member");
                resetMessages();
              }}
            >
              <Text style={[styles.tabText, activeTab === "member" && styles.tabTextActive]}>
                👥 Team Member
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Feedback Banners */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✅ {successMsg}</Text>
              </View>
            ) : null}

            {/* ================= ADMIN TAB ================= */}
            {activeTab === "admin" && (
              <View>
                {/* Sub Nav */}
                <View style={styles.subModeRow}>
                  <TouchableOpacity
                    style={[styles.subModeBtn, adminMode === "login" && styles.subModeBtnActive]}
                    onPress={() => { setAdminMode("login"); resetMessages(); }}
                  >
                    <Text style={[styles.subModeText, adminMode === "login" && styles.subModeTextActive]}>Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subModeBtn, adminMode === "otp" && styles.subModeBtnActive]}
                    onPress={() => { setAdminMode("otp"); resetMessages(); }}
                  >
                    <Text style={[styles.subModeText, adminMode === "otp" && styles.subModeTextActive]}>Email OTP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subModeBtn, adminMode === "signup" && styles.subModeBtnActive]}
                    onPress={() => { setAdminMode("signup"); resetMessages(); }}
                  >
                    <Text style={[styles.subModeText, adminMode === "signup" && styles.subModeTextActive]}>New Admin</Text>
                  </TouchableOpacity>
                </View>

                {/* Password Login */}
                {adminMode === "login" && (
                  <View>
                    <Text style={styles.inputLabel}>Admin Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ali@company.com"
                      placeholderTextColor="#666"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                    />

                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#666"
                      secureTextEntry
                      value={adminPassword}
                      onChangeText={setAdminPassword}
                    />

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleAdminPasswordLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Log in as Admin</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* OTP / Forgot Password */}
                {adminMode === "otp" && (
                  <View>
                    <Text style={styles.inputLabel}>Admin Email</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="ali@company.com"
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={adminEmail}
                        onChangeText={setAdminEmail}
                      />
                      <TouchableOpacity
                        style={styles.inlineActionBtn}
                        onPress={handleSendOtp}
                        disabled={loading}
                      >
                        <Text style={styles.inlineActionText}>{otpSent ? "Resend" : "Send Code"}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>6-Digit Supabase Email OTP Code</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="123456"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleVerifyOtp}
                      disabled={loading || !otpCode}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Verify Code & Login</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Admin Signup */}
                {adminMode === "signup" && (
                  <View>
                    <Text style={styles.inputLabel}>Admin Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ali"
                      placeholderTextColor="#666"
                      value={adminName}
                      onChangeText={setAdminName}
                    />

                    <Text style={styles.inputLabel}>Workspace Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Caspian Sentinel Team"
                      placeholderTextColor="#666"
                      value={workspaceName}
                      onChangeText={setWorkspaceName}
                    />

                    <Text style={styles.inputLabel}>Admin Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="admin@company.com"
                      placeholderTextColor="#666"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                    />

                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Create secure password"
                      placeholderTextColor="#666"
                      secureTextEntry
                      value={adminPassword}
                      onChangeText={setAdminPassword}
                    />

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleAdminSignup}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Register & Get Team Code</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ================= MEMBER TAB ================= */}
            {activeTab === "member" && (
              <View>
                <View style={styles.subModeRow}>
                  <TouchableOpacity
                    style={[styles.subModeBtn, memberMode === "login" && styles.subModeBtnActive]}
                    onPress={() => { setMemberMode("login"); resetMessages(); }}
                  >
                    <Text style={[styles.subModeText, memberMode === "login" && styles.subModeTextActive]}>Member Login</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subModeBtn, memberMode === "join" && styles.subModeBtnActive]}
                    onPress={() => { setMemberMode("join"); resetMessages(); }}
                  >
                    <Text style={[styles.subModeText, memberMode === "join" && styles.subModeTextActive]}>Have Team Code? Join</Text>
                  </TouchableOpacity>
                </View>

                {/* Direct Login */}
                {memberMode === "login" && (
                  <View>
                    <Text style={styles.inputLabel}>Your Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rahul, Neha, or Sumeet"
                      placeholderTextColor="#666"
                      value={memberName}
                      onChangeText={setMemberName}
                    />

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleMemberLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Log in to Workspace</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Join with Team Code */}
                {memberMode === "join" && (
                  <View>
                    {!teamVerified ? (
                      <View>
                        <Text style={styles.inputLabel}>Enter Team Code</Text>
                        <TextInput
                          style={[styles.input, styles.teamCodeInput]}
                          placeholder="CASPIAN-2026"
                          placeholderTextColor="#777"
                          autoCapitalize="characters"
                          value={teamCode}
                          onChangeText={(t) => setTeamCode(t.toUpperCase())}
                        />

                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={handleVerifyCode}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.primaryBtnText}>Verify Team Code</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Kavya Sharma"
                          placeholderTextColor="#666"
                          value={memberName}
                          onChangeText={setMemberName}
                        />

                        <Text style={styles.inputLabel}>Email Address</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="kavya@company.com"
                          placeholderTextColor="#666"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          value={memberEmail}
                          onChangeText={setMemberEmail}
                        />

                        <Text style={styles.inputLabel}>Phone / Contact Handle</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="+91-9876543210"
                          placeholderTextColor="#666"
                          value={memberContact}
                          onChangeText={setMemberContact}
                        />

                        <Text style={styles.inputLabel}>Role</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="QA Lead / Frontend Engineer"
                          placeholderTextColor="#666"
                          value={memberRole}
                          onChangeText={setMemberRole}
                        />

                        <Text style={styles.inputLabel}>Skills & Expertise (For AI Task Routing)</Text>
                        <TextInput
                          style={[styles.input, { height: 60 }]}
                          multiline
                          placeholder="Playwright, API testing, React, AWS..."
                          placeholderTextColor="#666"
                          value={memberSkills}
                          onChangeText={setMemberSkills}
                        />

                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={handleJoinSubmit}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.primaryBtnText}>Submit for Admin Approval</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
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
    backgroundColor: "rgba(10, 11, 16, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#161824",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(124, 105, 239, 0.3)",
    overflow: "hidden",
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#1c1a35",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: "#9aa5b8",
    fontSize: 18,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#12141d",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#7c69ef",
    backgroundColor: "#161824",
  },
  tabText: {
    color: "#78859b",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#a797ff",
  },
  body: {
    padding: 20,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
  },
  successBox: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    color: "#4ade80",
    fontSize: 12,
  },
  subModeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  subModeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#212433",
  },
  subModeBtnActive: {
    backgroundColor: "#7c69ef",
  },
  subModeText: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "600",
  },
  subModeTextActive: {
    color: "#fff",
  },
  inputLabel: {
    color: "#9aa5b8",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#0e1017",
    borderWidth: 1,
    borderColor: "#2d3142",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    alignItems: "center",
  },
  inlineActionBtn: {
    backgroundColor: "#2d3142",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  inlineActionText: {
    color: "#a797ff",
    fontSize: 12,
    fontWeight: "600",
  },
  otpInput: {
    backgroundColor: "#0e1017",
    borderWidth: 2,
    borderColor: "#7c69ef",
    borderStyle: "dashed",
    borderRadius: 8,
    color: "#a797ff",
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 16,
  },
  teamCodeInput: {
    borderColor: "#7c69ef",
    borderWidth: 2,
    color: "#a797ff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#7c69ef",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
