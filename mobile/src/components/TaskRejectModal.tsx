import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AppIcon } from "./Icons";
import { Task } from "../api";

interface TaskRejectModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirmReject: (taskId: number, reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  "⚡ Overloaded with priority sprint commitments",
  "🔒 Missing necessary permissions or repo access",
  "👥 Requires different domain/frontend expertise",
  "⏰ Estimated time exceeds scheduled deadline",
];

export const TaskRejectModal: React.FC<TaskRejectModalProps> = ({
  visible,
  task,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setReason("");
      setError("");
      setLoading(false);
    }
  }, [visible]);

  if (!task) return null;

  const handleSubmit = async () => {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError("Please provide a reason explaining why you cannot do this task.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirmReject(task.id, cleanReason);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reject task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <AppIcon name="shield" size={18} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Unable to Complete Task?</Text>
              <Text style={styles.headerSubtitle}>
                Provide feedback to your team lead on why you are declining this commitment.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Task Info Pill */}
          <View style={styles.taskInfoBox}>
            <Text style={styles.taskLabel}>TASK TO REJECT:</Text>
            <Text style={styles.taskTitleText}>{task.title}</Text>
            {task.deadline && (
              <Text style={styles.taskMetaText}>
                ⏰ Deadline: {new Date(task.deadline).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </Text>
            )}
          </View>

          {/* Quick Presets */}
          <Text style={styles.presetsLabel}>QUICK REASONS:</Text>
          <View style={styles.presetsContainer}>
            {PRESET_REASONS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  reason === preset && styles.presetChipActive,
                ]}
                onPress={() => setReason(preset)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    reason === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reason Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>REASON / COMMENT (REQUIRED):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Explain the blocker or why you are declining..."
              placeholderTextColor="#687385"
              value={reason}
              onChangeText={(txt) => {
                setReason(txt);
                if (error) setError("");
              }}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Error message */}
          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!reason.trim() || loading) && styles.confirmBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!reason.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <AppIcon name="close" size={15} color="#ffffff" />
                  <Text style={styles.confirmBtnText}>Submit & Decline</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 11, 18, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#161826",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262b42",
    padding: 20,
    ...Platform.select({
      web: { boxShadow: "0px 16px 40px rgba(0, 0, 0, 0.6)" },
      default: { elevation: 12 },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  headerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
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
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "700",
  },
  taskInfoBox: {
    backgroundColor: "#0e101a",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2235",
    marginBottom: 14,
  },
  taskLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  taskTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  taskMetaText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  presetsLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  presetsContainer: {
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: "#1c2033",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a304d",
  },
  presetChipActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "#ef4444",
  },
  presetChipText: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  presetChipTextActive: {
    color: "#fca5a5",
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#0e101a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262b42",
    padding: 12,
    color: "#ffffff",
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginBottom: 12,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#202438",
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#dc2626",
  },
  confirmBtnDisabled: {
    backgroundColor: "#522226",
    opacity: 0.6,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
