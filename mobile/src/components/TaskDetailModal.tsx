import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { AppIcon } from "./Icons";
import { Task, Member } from "../api";

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  owner?: Member;
  onClose: () => void;
  onAccept?: (taskId: number) => void;
  onOpenReject?: (task: Task) => void;
  onOpenComplete?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  owner,
  onClose,
  onAccept,
  onOpenReject,
  onOpenComplete,
}) => {
  if (!task) return null;

  // Extract parsed sections from description
  const description = task.description || "";
  let resolvedComment = "";
  let rejectedComment = "";
  let aiProblemSummary = description;

  if (description.includes("[RESOLVED by")) {
    const parts = description.split("[RESOLVED by");
    aiProblemSummary = parts[0].trim();
    resolvedComment = "[RESOLVED by" + parts[1];
  } else if (description.includes("[REJECTED by")) {
    const parts = description.split("[REJECTED by");
    aiProblemSummary = parts[0].trim();
    rejectedComment = "[REJECTED by" + parts[1];
  }

  if (!aiProblemSummary) {
    aiProblemSummary = task.title;
  }

  const isPendingAck = task.status === "PENDING_ACK";
  const isDone = task.status === "DONE";
  const isCancelled = task.status === "CANCELLED";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <AppIcon name="shield" variant="filled" size={20} color="#7c69ef" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Task Details & AI Summary</Text>
              <Text style={styles.headerSubtitle}>
                Autonomous directive breakdown and resolution logs
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {/* Title & Status */}
            <View style={styles.sectionCard}>
              <View style={styles.statusRow}>
                <Text style={styles.taskTitleText}>{task.title}</Text>
                <View
                  style={[
                    styles.statusPill,
                    isPendingAck && styles.statusPillPending,
                    isDone && styles.statusPillDone,
                    isCancelled && styles.statusPillCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isPendingAck && styles.statusPillTextPending,
                      isDone && styles.statusPillTextDone,
                      isCancelled && styles.statusPillTextCancelled,
                    ]}
                  >
                    {isPendingAck ? "⏳ Awaiting Acceptance" : isDone ? "✓ Completed" : isCancelled ? "✕ Declined" : "⚡ In Progress"}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>
                  👤 <Text style={styles.metaBold}>{owner?.name || `Member #${task.owner_id}`}</Text>
                  {owner?.role ? ` (${owner.role})` : ""}
                </Text>
                {task.deadline && (
                  <Text style={styles.metaItem}>
                    ⏰ Due: <Text style={styles.metaBold}>{new Date(task.deadline).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text>
                  </Text>
                )}
              </View>
            </View>

            {/* AI Problem Summary */}
            <View style={styles.aiSummaryCard}>
              <View style={styles.aiSummaryHeader}>
                <AppIcon name="shield" size={14} color="#7c69ef" />
                <Text style={styles.aiSummaryTitle}>AI PROBLEM SUMMARY & CONTEXT</Text>
              </View>
              <Text style={styles.aiSummaryBody}>
                {aiProblemSummary}
              </Text>
            </View>

            {/* Resolution Comment (if solved) */}
            {resolvedComment ? (
              <View style={styles.resolutionCard}>
                <View style={styles.resolutionHeader}>
                  <Text style={styles.resolutionTitle}>✓ RESOLUTION REPORT</Text>
                </View>
                <Text style={styles.resolutionBody}>
                  {resolvedComment}
                </Text>
              </View>
            ) : null}

            {/* Rejection Comment (if rejected) */}
            {rejectedComment ? (
              <View style={styles.rejectionCard}>
                <View style={styles.rejectionHeader}>
                  <Text style={styles.rejectionTitle}>✕ DECLINE & BLOCKER REPORT</Text>
                </View>
                <Text style={styles.rejectionBody}>
                  {rejectedComment}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {isPendingAck && (
                <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => {
                      onClose();
                      if (onAccept) onAccept(task.id);
                    }}
                  >
                    <Text style={styles.actionBtnText}>✓ Accept Task</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => {
                      onClose();
                      if (onOpenReject) onOpenReject(task);
                    }}
                  >
                    <Text style={styles.actionBtnText}>✕ Reject Task</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!isDone && !isCancelled && !isPendingAck && (
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => {
                    onClose();
                    if (onOpenComplete) onOpenComplete(task);
                  }}
                >
                  <Text style={styles.actionBtnText}>✓ Mark as Done with Solution</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 11, 18, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: "#161826",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262b42",
    padding: 20,
    ...Platform.select({
      web: { boxShadow: "0px 18px 48px rgba(0, 0, 0, 0.7)" },
      default: { elevation: 14 },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#22263d",
    paddingBottom: 14,
  },
  headerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(124, 105, 239, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(124, 105, 239, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#0f111c",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2238",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  taskTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 20,
  },
  statusPill: {
    backgroundColor: "rgba(124, 105, 239, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
  },
  statusPillDone: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  statusPillCancelled: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a797ff",
  },
  statusPillTextPending: {
    color: "#fbbf24",
  },
  statusPillTextDone: {
    color: "#4ade80",
  },
  statusPillTextCancelled: {
    color: "#f87171",
  },
  metaRow: {
    gap: 4,
  },
  metaItem: {
    fontSize: 12,
    color: "#94a3b8",
  },
  metaBold: {
    color: "#e2e8f0",
    fontWeight: "600",
  },
  aiSummaryCard: {
    backgroundColor: "rgba(124, 105, 239, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124, 105, 239, 0.22)",
    padding: 14,
  },
  aiSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  aiSummaryTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#a797ff",
    letterSpacing: 0.5,
  },
  aiSummaryBody: {
    fontSize: 13,
    color: "#e2e8f0",
    lineHeight: 19,
  },
  resolutionCard: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
    padding: 14,
  },
  resolutionHeader: {
    marginBottom: 6,
  },
  resolutionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4ade80",
    letterSpacing: 0.5,
  },
  resolutionBody: {
    fontSize: 13,
    color: "#f0fdf4",
    lineHeight: 18,
  },
  rejectionCard: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    padding: 14,
  },
  rejectionHeader: {
    marginBottom: 6,
  },
  rejectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#f87171",
    letterSpacing: 0.5,
  },
  rejectionBody: {
    fontSize: 13,
    color: "#fef2f2",
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: 6,
    paddingTop: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  completeBtn: {
    width: "100%",
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
