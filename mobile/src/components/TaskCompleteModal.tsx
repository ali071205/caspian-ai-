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

interface TaskCompleteModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirmComplete: (taskId: number, solution: string) => Promise<void>;
}

const RESOLUTION_PRESETS = [
  "🚀 Fixed bug & deployed update to staging/prod",
  "🧪 Implemented code changes & passed all test suites",
  "🔧 Configured environment & updated dependencies",
  "📄 Completed architectural review and documentation",
];

export const TaskCompleteModal: React.FC<TaskCompleteModalProps> = ({
  visible,
  task,
  onClose,
  onConfirmComplete,
}) => {
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setSolution("");
      setError("");
      setLoading(false);
    }
  }, [visible]);

  if (!task) return null;

  const handleSubmit = async () => {
    const cleanSolution = solution.trim();
    if (!cleanSolution) {
      setError("Please describe how you resolved this task.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirmComplete(task.id, cleanSolution);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to complete task");
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
              <AppIcon name="shield" size={18} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Resolve & Complete Task</Text>
              <Text style={styles.headerSubtitle}>
                Explain how you solved this commitment for your team lead and workspace audit.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Task Info Pill */}
          <View style={styles.taskInfoBox}>
            <Text style={styles.taskLabel}>TASK BEING COMPLETED:</Text>
            <Text style={styles.taskTitleText}>{task.title}</Text>
          </View>

          {/* Quick Presets */}
          <Text style={styles.presetsLabel}>QUICK RESOLUTIONS:</Text>
          <View style={styles.presetsContainer}>
            {RESOLUTION_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  solution === preset && styles.presetChipActive,
                ]}
                onPress={() => setSolution(preset)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    solution === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Solution Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>HOW WAS THIS TASK SOLVED? (REQUIRED):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Fixed the API schema validation error and verified live endpoints..."
              placeholderTextColor="#687385"
              value={solution}
              onChangeText={(txt) => {
                setSolution(txt);
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
                (!solution.trim() || loading) && styles.confirmBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!solution.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.confirmBtnText}>✓ Mark as Done</Text>
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
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
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
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "#22c55e",
  },
  presetChipText: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  presetChipTextActive: {
    color: "#86efac",
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
    backgroundColor: "#16a34a",
  },
  confirmBtnDisabled: {
    backgroundColor: "#1e3a29",
    opacity: 0.6,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
