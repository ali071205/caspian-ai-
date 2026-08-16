import React, { useState, useEffect } from "react";
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
import { AppIcon } from "./Icons";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: UserAuth) => void;
}

const DEMO_ACCOUNTS = [
  { name: "Ali", role: "Admin", email: "ali@company.com", type: "admin" },
  { name: "Kevin", role: "Backend Eng", email: "kevin@company.com", type: "member" },
  { name: "Antony Jacob", role: "Product Lead", email: "antony@company.com", type: "member" },
  { name: "Leslie Alexander", role: "UI Designer", email: "leslie@company.com", type: "member" },
  { name: "Wade Warren", role: "QA Researcher", email: "wade@company.com", type: "member" },
];

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<"admin" | "member">("admin");
  const [adminMode, setAdminMode] = useState<"login" | "otp" | "signup">("login");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminName, setAdminName] = useState("Ali");
  const [workspaceName, setWorkspaceName] = useState("Caspian Sentinel Team");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [memberMode, setMemberMode] = useState<"login" | "join">("login");
  const [memberName, setMemberName] = useState("");
  const [teamCode, setTeamCode] = useState("CASPIAN-2026");
  const [teamVerified, setTeamVerified] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("");

  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const reset = () => { setErrorMsg(""); setSuccessMsg(""); };

  useEffect(() => {
    let interval: any = null;
    if (waitingForApproval && memberName.trim() && visible) {
      interval = setInterval(async () => {
        try {
          const user = await memberLogin(memberName.trim());
          if (user && user.user_id) {
            clearInterval(interval);
            setWaitingForApproval(false);
            setSuccessMsg(`🎉 Approved! Welcome ${user.name}!`);
            setTimeout(() => { onSuccess(user); onClose(); }, 800);
          }
        } catch {}
      }, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [waitingForApproval, memberName, visible, onSuccess, onClose]);

  const handleQuickDemo = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setLoading(true);
    reset();
    try {
      const user = acc.type === "admin"
        ? await adminLogin({ email: acc.email, password: "admin123" })
        : await memberLogin(acc.name);
      setSuccessMsg(`Welcome ${user.name}!`);
      setTimeout(() => { onSuccess(user); onClose(); }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    reset();
    try {
      const user = await adminLogin({
        email: adminEmail.trim() || "ali@company.com",
        password: adminPassword || "admin123",
      });
      setSuccessMsg(`Welcome Admin ${user.name}!`);
      setTimeout(() => { onSuccess(user); onClose(); }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!adminEmail.trim()) return setErrorMsg("Enter email");
    setLoading(true);
    reset();
    try {
      await adminSendOtp(adminEmail.trim());
      setOtpSent(true);
      setSuccessMsg("OTP code sent to email!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return setErrorMsg("Enter 6-digit OTP");
    setLoading(true);
    reset();
    try {
      const user = await adminVerifyOtp({ email: adminEmail.trim(), token_code: otpCode.trim() });
      setSuccessMsg(`Verified! Welcome ${user.name}`);
      setTimeout(() => { onSuccess(user); onClose(); }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) return setErrorMsg("Fill Email & Password");
    setLoading(true);
    reset();
    try {
      const user = await adminSignup({
        email: adminEmail.trim(),
        password: adminPassword,
        name: adminName.trim() || "Ali",
        workspace_name: workspaceName.trim() || "Caspian Team",
      });
      setSuccessMsg(`Workspace created! Code: ${user.team_code}`);
      setTimeout(() => { onSuccess(user); onClose(); }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberLogin = async () => {
    if (!memberName.trim()) return setErrorMsg("Enter member name");
    setLoading(true);
    reset();
    try {
      const user = await memberLogin(memberName.trim());
      setSuccessMsg(`Welcome ${user.name}!`);
      setTimeout(() => { onSuccess(user); onClose(); }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || "Sign-in failed. Ensure name is approved.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!teamCode.trim()) return setErrorMsg("Enter team code");
    setLoading(true);
    reset();
    try {
      const res = await verifyTeamCode(teamCode.trim().toUpperCase());
      setTeamVerified(true);
      setSuccessMsg(`Verified for ${res.team_name}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid team code");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async () => {
    if (!memberName.trim() || !memberEmail.trim() || !memberRole.trim()) return setErrorMsg("Fill Name, Email, and Role");
    setLoading(true);
    reset();
    try {
      await submitJoinRequest({
        team_code: teamCode.trim().toUpperCase(),
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole.trim(),
      });
      setWaitingForApproval(true);
      setSuccessMsg("Request submitted! Awaiting Admin approval.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppIcon name="shield" variant="filled" size={16} color="#a797ff" />
              <Text style={styles.headerBrand}>CASPIAN SENTINEL GATEWAY</Text>
            </View>
            <TouchableOpacity onPress={onClose}><AppIcon name="close" size={16} color="#9aa5b8" /></TouchableOpacity>
          </View>

          {/* Quick 1-Tap Demo Switcher */}
          <View style={styles.demoBar}>
            <Text style={styles.demoBarTitle}>⚡ 1-Tap Quick Login:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.demoChip, acc.type === "admin" && styles.demoChipAdmin]}
                  onPress={() => handleQuickDemo(acc)}
                  disabled={loading}
                >
                  <Text style={[styles.demoChipText, acc.type === "admin" && styles.demoChipTextAdmin]}>
                    {acc.type === "admin" ? "👑" : "👤"} {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "admin" && styles.tabBtnActive]}
              onPress={() => { setActiveTab("admin"); reset(); }}
            >
              <Text style={[styles.tabText, activeTab === "admin" && styles.tabTextActive]}>👑 Admin Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "member" && styles.tabBtnActive]}
              onPress={() => { setActiveTab("member"); reset(); }}
            >
              <Text style={[styles.tabText, activeTab === "member" && styles.tabTextActive]}>👥 Team Worker</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {errorMsg ? <Text style={styles.errBox}>⚠️ {errorMsg}</Text> : null}
            {successMsg ? <Text style={styles.succBox}>✓ {successMsg}</Text> : null}

            {activeTab === "admin" && (
              <View>
                <View style={styles.subModeRow}>
                  {[
                    { key: "login", label: "🔑 Password" },
                    { key: "otp", label: "✉️ OTP" },
                    { key: "signup", label: "➕ Register" },
                  ].map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.subModeBtn, adminMode === m.key && styles.subModeBtnActive]}
                      onPress={() => { setAdminMode(m.key as any); reset(); }}
                    >
                      <Text style={[styles.subModeText, adminMode === m.key && styles.subModeTextActive]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {adminMode === "login" && (
                  <View>
                    <Text style={styles.label}>Admin Email</Text>
                    <TextInput style={styles.input} placeholder="ali@company.com" placeholderTextColor="#64748b" value={adminEmail} onChangeText={setAdminEmail} autoCapitalize="none" />
                    <Text style={styles.label}>Password</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TextInput style={[styles.input, { flex: 1 }]} placeholder="••••••••" placeholderTextColor="#64748b" secureTextEntry={!showPassword} value={adminPassword} onChangeText={setAdminPassword} />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 8, padding: 6 }}>
                        <AppIcon name={showPassword ? "eye-off" : "eye"} size={14} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.btn} onPress={handleAdminLogin} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Sign In as Admin</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {adminMode === "otp" && (
                  <View>
                    <Text style={styles.label}>Admin Email</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TextInput style={[styles.input, { flex: 1 }]} placeholder="ali@company.com" placeholderTextColor="#64748b" value={adminEmail} onChangeText={setAdminEmail} autoCapitalize="none" />
                      <TouchableOpacity style={styles.inlineBtn} onPress={handleSendOtp} disabled={loading}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{otpSent ? "Resend" : "Send OTP"}</Text>
                      </TouchableOpacity>
                    </View>
                    {otpSent && (
                      <View>
                        <Text style={styles.label}>6-Digit Code</Text>
                        <TextInput style={[styles.input, styles.otpInput]} placeholder="••••••" placeholderTextColor="#475569" keyboardType="number-pad" maxLength={6} value={otpCode} onChangeText={setOtpCode} />
                        <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
                          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Verify & Sign In</Text>}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {adminMode === "signup" && (
                  <View>
                    <Text style={styles.label}>Workspace Name</Text>
                    <TextInput style={styles.input} placeholder="Caspian Team" placeholderTextColor="#64748b" value={workspaceName} onChangeText={setWorkspaceName} />
                    <Text style={styles.label}>Admin Name</Text>
                    <TextInput style={styles.input} placeholder="Ali Ahmad" placeholderTextColor="#64748b" value={adminName} onChangeText={setAdminName} />
                    <Text style={styles.label}>Email</Text>
                    <TextInput style={styles.input} placeholder="admin@company.com" placeholderTextColor="#64748b" value={adminEmail} onChangeText={setAdminEmail} autoCapitalize="none" />
                    <Text style={styles.label}>Password</Text>
                    <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#64748b" secureTextEntry value={adminPassword} onChangeText={setAdminPassword} />
                    <TouchableOpacity style={styles.btn} onPress={handleAdminSignup} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Create Workspace</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {activeTab === "member" && (
              <View>
                {waitingForApproval ? (
                  <View style={{ alignItems: "center", padding: 14 }}>
                    <ActivityIndicator size="large" color="#7c69ef" style={{ marginBottom: 8 }} />
                    <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800" }}>⏳ Awaiting Admin Approval</Text>
                    <Text style={{ color: "#9aa5b8", fontSize: 11, marginTop: 4, marginBottom: 12 }}>Joining as {memberName}</Text>
                    <TouchableOpacity style={styles.btn} onPress={() => memberLogin(memberName.trim()).then(u => { if (u?.user_id) { onSuccess(u); onClose(); } }).catch(() => setErrorMsg("Still pending."))}><Text style={styles.btnText}>Check Status Now</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.subModeRow}>
                      {[
                        { key: "login", label: "👤 Sign In" },
                        { key: "join", label: "🚀 Join Team" },
                      ].map((m) => (
                        <TouchableOpacity
                          key={m.key}
                          style={[styles.subModeBtn, memberMode === m.key && styles.subModeBtnActive]}
                          onPress={() => { setMemberMode(m.key as any); reset(); }}
                        >
                          <Text style={[styles.subModeText, memberMode === m.key && styles.subModeTextActive]}>{m.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {memberMode === "login" ? (
                      <View>
                        <Text style={styles.label}>Registered Member Name</Text>
                        <TextInput style={styles.input} placeholder="e.g. Kevin / Antony" placeholderTextColor="#64748b" value={memberName} onChangeText={setMemberName} />
                        <TouchableOpacity style={styles.btn} onPress={handleMemberLogin} disabled={loading}>
                          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Enter Workspace</Text>}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        {!teamVerified ? (
                          <View>
                            <Text style={styles.label}>Team Invite Code</Text>
                            <TextInput style={[styles.input, { borderColor: "#7c69ef", textAlign: "center", fontWeight: "700" }]} placeholder="CASPIAN-2026" placeholderTextColor="#475569" autoCapitalize="characters" value={teamCode} onChangeText={t => setTeamCode(t.toUpperCase())} />
                            <TouchableOpacity style={styles.btn} onPress={handleVerifyCode} disabled={loading}><Text style={styles.btnText}>Verify Team Code</Text></TouchableOpacity>
                          </View>
                        ) : (
                          <View>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} placeholder="Kavya Sharma" placeholderTextColor="#64748b" value={memberName} onChangeText={setMemberName} />
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput style={styles.input} placeholder="kavya@company.com" placeholderTextColor="#64748b" value={memberEmail} onChangeText={setMemberEmail} autoCapitalize="none" />
                            <Text style={styles.label}>Role in Team</Text>
                            <TextInput style={styles.input} placeholder="Engineer / QA" placeholderTextColor="#64748b" value={memberRole} onChangeText={setMemberRole} />
                            <TouchableOpacity style={styles.btn} onPress={handleJoinSubmit} disabled={loading}><Text style={styles.btnText}>Submit for Approval</Text></TouchableOpacity>
                          </View>
                        )}
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
  overlay: { flex: 1, backgroundColor: "rgba(6, 8, 14, 0.88)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { width: "100%", maxWidth: 400, backgroundColor: "#121420", borderRadius: 18, borderWidth: 1, borderColor: "rgba(124, 105, 239, 0.3)", overflow: "hidden", maxHeight: "88%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.08)", backgroundColor: "#181a28" },
  headerBrand: { color: "#ffffff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  demoBar: { backgroundColor: "#0d0f18", paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.05)" },
  demoBarTitle: { color: "#a797ff", fontSize: 9, fontWeight: "700", marginBottom: 3 },
  demoChip: { backgroundColor: "#1e2235", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  demoChipAdmin: { backgroundColor: "rgba(124, 105, 239, 0.25)" },
  demoChipText: { color: "#cbd5e1", fontSize: 10 },
  demoChipTextAdmin: { color: "#c4b5fd", fontWeight: "700" },
  tabRow: { flexDirection: "row", backgroundColor: "#10121d", borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.08)" },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#7c69ef", backgroundColor: "#161826" },
  tabText: { color: "#78859b", fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: "#a797ff", fontWeight: "700" },
  errBox: { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: 11, padding: 6, borderRadius: 6, marginBottom: 10 },
  succBox: { backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#4ade80", fontSize: 11, padding: 6, borderRadius: 6, marginBottom: 10 },
  subModeRow: { flexDirection: "row", backgroundColor: "#0d0f18", padding: 2, borderRadius: 6, marginBottom: 12, gap: 2 },
  subModeBtn: { flex: 1, paddingVertical: 5, borderRadius: 5, alignItems: "center" },
  subModeBtnActive: { backgroundColor: "#7c69ef" },
  subModeText: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  subModeTextActive: { color: "#ffffff", fontWeight: "700" },
  label: { color: "#94a3b8", fontSize: 10, marginBottom: 3, fontWeight: "600" },
  input: { backgroundColor: "#0d0f18", borderWidth: 1, borderColor: "#282c3f", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, color: "#ffffff", fontSize: 12, marginBottom: 10 },
  otpInput: { borderColor: "#7c69ef", fontSize: 18, fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  inlineBtn: { backgroundColor: "#7c69ef", borderRadius: 7, paddingHorizontal: 10, justifyContent: "center", marginBottom: 10 },
  btn: { backgroundColor: "#7c69ef", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 2 },
  btnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
});
