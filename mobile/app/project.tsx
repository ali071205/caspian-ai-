import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppIcon } from "../src/components/Icons";

export default function ProjectDetailScreen() {
  const [activeTab, setActiveTab] = useState<"overview" | "stack" | "team" | "history">("overview");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const projectInfo = {
    name: "Caspian Sentinel AI",
    tagline: "Autonomous Multi-Agent Workspace Orchestration & Team Operations",
    version: "v2.4.0 (Enterprise Live)",
    repoUrl: "https://github.com/ali071205/caspian-ai-",
    apiUrl: "http://10.249.229.29:8000",
    webUrl: "http://localhost:8081",
    teamCode: "CASPIAN-2026",
  };

  const projectHistory = [
    { date: "12 Aug", title: "Project Foundation", detail: "FastAPI, SQLAlchemy, and Expo workspace created." },
    { date: "12–14 Aug", title: "TeamOps Task Engine", detail: "Tasks, status history, deadlines, dependencies, risk propagation." },
    { date: "14–16 Aug", title: "AI Command Dispatcher", detail: "Natural language directives, single-recipient privacy, guarded routing." },
    { date: "16 Aug", title: "Auth & Workspace Gateway", detail: "Admin Supabase auth, OTP, team codes, auto-approval polling." },
    { date: "16 Aug", title: "Quality & Verification", detail: "43 backend pytest tests and mobile TypeScript validation passing." },
  ];

  const pendingWork = [
    "Persistent encrypted session storage on mobile restart",
    "Native push notifications when app is in background",
    "Production hosting, HTTPS, and domain SSL deployment",
  ];

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else showToast("Could not open this link");
    } catch {
      showToast("Could not open this link");
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2200);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f8fc" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <AppIcon name="arrow-back" size={20} color="#24233a" />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>Project details</Text>
            <Text style={styles.headerSub}>What’s ready and what’s next</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => showToast("Repository link is ready to share") }>
            <AppIcon name="share" size={16} color="#a797ff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Project Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <AppIcon name="shield" variant="filled" size={20} color="#a797ff" />
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>In progress</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{projectInfo.name}</Text>
            <Text style={styles.heroTagline}>{projectInfo.tagline}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaBox}><Text style={styles.metaLabel}>VERSION</Text><Text style={styles.metaVal}>{projectInfo.version}</Text></View>
              <View style={styles.metaBox}><Text style={styles.metaLabel}>TEAM CODE</Text><Text style={styles.metaVal}>{projectInfo.teamCode}</Text></View>
              <View style={styles.metaBox}><Text style={styles.metaLabel}>ENGINE</Text><Text style={styles.metaVal}>Expo 54 / FastAPI</Text></View>
            </View>
          </View>

          {/* GitHub Repo Card */}
          <TouchableOpacity style={styles.repoCard} onPress={() => handleOpenLink(projectInfo.repoUrl)}>
            <View style={styles.repoIcon}><AppIcon name="categories" size={18} color="#a797ff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.repoTitle}>GitHub Repository</Text>
              <Text style={styles.repoSub}>ali071205/caspian-ai-</Text>
            </View>
            <AppIcon name="arrow-forward" size={16} color="#64748b" />
          </TouchableOpacity>

          {/* Tab Navigation */}
          <View style={styles.tabsRow}>
            {[
              { key: "overview", label: "Overview", icon: "explore" },
              { key: "stack", label: "Tools", icon: "settings" },
              { key: "team", label: "Team", icon: "user" },
              { key: "history", label: "History", icon: "library" },
            ].map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as any)}
              >
                <AppIcon name={t.icon as any} size={13} color={activeTab === t.key ? "#6f58ea" : "#858397"} />
                <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB CONTENT */}
          <View style={styles.contentCard}>
            {activeTab === "overview" && (
              <View>
                <Text style={styles.sectionHeader}>What the app can do</Text>
                {[
                  { title: "Assign work in plain language", desc: "Write a request like ‘Kevin, fix payment by Friday’ and the app creates the assigned task." },
                  { title: "Keep each member’s work private", desc: "Members see their own work while admins can manage the complete team." },
                  { title: "Control who joins the team", desc: "New members use the team code and wait for admin approval before getting access." },
                ].map((item, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={styles.bullet}><Text style={styles.bulletText}>✓</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{item.title}</Text>
                      <Text style={styles.featureDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "stack" && (
              <View>
                <Text style={styles.sectionHeader}>⚡ Architecture & Stack</Text>
                {[
                  { cat: "Frontend Mobile & Web", desc: "React Native · Expo SDK 54 · TypeScript · Expo Router" },
                  { cat: "Backend Framework", desc: "Python 3.11 · FastAPI · SQLAlchemy 2.0 · SQLite POSIX" },
                  { cat: "Security & Authentication", desc: "Supabase Auth · 6-digit Email OTP · Workspace Invite Codes" },
                  { cat: "Automated Test Suite", desc: "43 Passing Pytest Unit & Integration Tests (100% green)" },
                ].map((s, i) => (
                  <View key={i} style={styles.stackRow}>
                    <Text style={styles.stackCat}>{s.cat}</Text>
                    <Text style={styles.stackDesc}>{s.desc}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "team" && (
              <View>
                <Text style={styles.sectionHeader}>👥 Seeded Team Workspace</Text>
                {[
                  { name: "Ali (Admin)", role: "Workspace Owner / Admin", admin: true },
                  { name: "Kevin", role: "Backend Engineer (FastAPI & DB)", admin: false },
                  { name: "Antony Jacob", role: "Product Lead", admin: false },
                  { name: "Leslie Alexander", role: "UI/UX Designer", admin: false },
                  { name: "Wade Warren", role: "QA & User Researcher", admin: false },
                ].map((m, i) => (
                  <View key={i} style={styles.memberRow}>
                    <View style={styles.avatarMini}><Text style={styles.avatarMiniText}>{m.name[0]}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberRole}>{m.role}</Text>
                    </View>
                    <View style={[styles.badge, m.admin ? styles.badgeAdmin : styles.badgeMember]}>
                      <Text style={[styles.badgeText, m.admin && { color: "#6f58ea" }]}>{m.admin ? "Admin" : "Member"}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "history" && (
              <View>
                <Text style={styles.sectionHeader}>Delivery History</Text>
                <View style={styles.historyGroupHeader}>
                  <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                  <Text style={styles.groupTitle}>Completed Milestones ({projectHistory.length})</Text>
                </View>
                {projectHistory.map((item, i) => (
                  <View key={`d-${i}`} style={styles.historyItem}>
                    <View style={styles.checkBadge}><Text style={styles.checkBadgeText}>✓</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.historyTitle}>{item.title}</Text>
                        <Text style={styles.historyDate}>{item.date}</Text>
                      </View>
                      <Text style={styles.historyDesc}>{item.detail}</Text>
                    </View>
                  </View>
                ))}

                <View style={[styles.historyGroupHeader, { marginTop: 16 }]}>
                  <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                  <Text style={styles.groupTitle}>Pending Release Roadmap ({pendingWork.length})</Text>
                </View>
                {pendingWork.map((item, i) => (
                  <View key={`p-${i}`} style={styles.historyItem}>
                    <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>○</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{item}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => handleOpenLink(projectInfo.repoUrl)}>
              <AppIcon name="categories" size={15} color="#ffffff" />
              <Text style={styles.btnTextPrimary}>Open GitHub Repo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => showToast(`Team code: ${projectInfo.teamCode}`)}>
              <AppIcon name="copy" size={15} color="#a797ff" />
              <Text style={styles.btnTextSecondary}>Copy Code</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {toastMessage && (
          <View style={styles.toast} pointerEvents="none">
            <View style={styles.toastCheck}><Text style={styles.toastCheckText}>✓</Text></View>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#f7f8fc", paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 6 : 0 },
  container: { flex: 1, backgroundColor: "#f7f8fc" },
  toast: { position: "absolute", left: 20, right: 20, bottom: 24, backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000000", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  toastCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#eaf8ef", alignItems: "center", justifyContent: "center" },
  toastCheckText: { color: "#23824a", fontSize: 12, fontWeight: "900" },
  toastText: { flex: 1, color: "#24233a", fontSize: 12, fontWeight: "700" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e7e7ee" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e1e1e9" },
  headerTitle: { color: "#24233a", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "#858397", fontSize: 10, marginTop: 2 },
  scrollContent: { width: "100%", maxWidth: 960, alignSelf: "center", padding: 16, paddingBottom: 80 },
  heroCard: { backgroundColor: "#ffffff", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#e5e3ef", borderLeftWidth: 5, borderLeftColor: "#7c69ef", marginBottom: 12 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  heroBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#eeeaff", alignItems: "center", justifyContent: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#eaf8ef", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  statusText: { color: "#23824a", fontSize: 10, fontWeight: "700" },
  heroTitle: { color: "#24233a", fontSize: 24, fontWeight: "800", marginBottom: 5 },
  heroTagline: { color: "#6f6d80", fontSize: 12, lineHeight: 18, marginBottom: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaBox: { flexGrow: 1, flexBasis: "46%", backgroundColor: "#f7f7fb", padding: 10, borderRadius: 11, borderWidth: 1, borderColor: "#ecebf2" },
  metaLabel: { color: "#858397", fontSize: 9, fontWeight: "700", marginBottom: 3 },
  metaVal: { color: "#24233a", fontSize: 11, fontWeight: "700" },
  repoCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", padding: 13, borderRadius: 13, marginBottom: 12, gap: 10, borderWidth: 1, borderColor: "#e5e3ef" },
  repoIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#eeeaff", alignItems: "center", justifyContent: "center" },
  repoTitle: { color: "#24233a", fontSize: 12, fontWeight: "700" },
  repoSub: { color: "#858397", fontSize: 10 },
  tabsRow: { flexDirection: "row", backgroundColor: "#ececf2", borderRadius: 11, padding: 3, marginBottom: 12, gap: 3 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 7, borderRadius: 7, gap: 4 },
  tabBtnActive: { backgroundColor: "#ffffff" },
  tabText: { color: "#858397", fontSize: 10, fontWeight: "600" },
  tabTextActive: { color: "#6f58ea", fontWeight: "800" },
  contentCard: { backgroundColor: "#ffffff", borderRadius: 15, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "#e5e3ef" },
  sectionHeader: { color: "#24233a", fontSize: 15, fontWeight: "800", marginBottom: 14 },
  featureRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  bullet: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#eeeaff", alignItems: "center", justifyContent: "center" },
  bulletText: { color: "#6f58ea", fontSize: 11, fontWeight: "800" },
  featureTitle: { color: "#24233a", fontSize: 12, fontWeight: "800", marginBottom: 3 },
  featureDesc: { color: "#6f6d80", fontSize: 11, lineHeight: 17 },
  stackRow: { paddingBottom: 11, marginBottom: 11, borderBottomWidth: 1, borderBottomColor: "#eeeeF3" },
  stackCat: { color: "#24233a", fontSize: 12, fontWeight: "700", marginBottom: 3 },
  stackDesc: { color: "#6f6d80", fontSize: 11, lineHeight: 16 },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#eeeeF3", gap: 10 },
  avatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#eeeaff", alignItems: "center", justifyContent: "center" },
  avatarMiniText: { color: "#6f58ea", fontSize: 12, fontWeight: "700" },
  memberName: { color: "#24233a", fontSize: 12, fontWeight: "700" },
  memberRole: { color: "#777589", fontSize: 10 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeAdmin: { backgroundColor: "#eeeaff" },
  badgeMember: { backgroundColor: "#f1f1f5" },
  badgeText: { color: "#777589", fontSize: 9, fontWeight: "700" },
  historyGroupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  groupTitle: { color: "#24233a", fontSize: 12, fontWeight: "700" },
  historyItem: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#eeeeF3", gap: 8 },
  checkBadge: { width: 22, height: 22, borderRadius: 7, backgroundColor: "rgba(34, 197, 94, 0.15)", alignItems: "center", justifyContent: "center" },
  checkBadgeText: { color: "#4ade80", fontSize: 11, fontWeight: "900" },
  pendingBadge: { width: 22, height: 22, borderRadius: 7, backgroundColor: "rgba(245, 158, 11, 0.15)", alignItems: "center", justifyContent: "center" },
  pendingBadgeText: { color: "#fbbf24", fontSize: 12, fontWeight: "800" },
  historyTitle: { color: "#24233a", fontSize: 11, fontWeight: "700" },
  historyDate: { color: "#6f58ea", fontSize: 9, fontWeight: "700" },
  historyDesc: { color: "#777589", fontSize: 10, marginTop: 2, lineHeight: 15 },
  actionRow: { flexDirection: "row", gap: 8 },
  btnPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#7c69ef", paddingVertical: 12, borderRadius: 10, gap: 6 },
  btnTextPrimary: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  btnSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", paddingVertical: 12, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: "#d8d0ff" },
  btnTextSecondary: { color: "#6f58ea", fontSize: 12, fontWeight: "700" },
});
