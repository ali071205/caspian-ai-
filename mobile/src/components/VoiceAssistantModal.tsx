import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  analyzeVoiceDirective,
  confirmVoiceTransfer,
  Member,
  transcribeNativeAudioFile,
  transcribeVoiceAudio,
  VoiceAnalysisPreview,
} from "../api";
import { AppIcon } from "./Icons";

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  senderName: string;
  teamCode?: string;
  members?: Member[];
  onTaskCreated?: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  visible,
  onClose,
  senderName,
  teamCode,
  members = [],
  onTaskCreated,
}) => {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VoiceAnalysisPreview | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const nativeRecordingRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const mediaStreamRef = useRef<any>(null);

  // Initialize Web Speech Recognition if on web
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " ";
          }
          if (currentTranscript.trim()) {
            setInputText(currentTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Reset states when modal is opened or closed
  useEffect(() => {
    if (!visible) {
      stopRecordingSession();
      setInputText("");
      setAnalysisResult(null);
      setSelectedOwnerId(null);
      setStatusMessage("");
      setSuccessMessage("");
    }
  }, [visible]);

  const startRecordingSession = async () => {
    setAnalysisResult(null);
    setSelectedOwnerId(null);
    setSuccessMessage("");
    audioChunksRef.current = [];

    // Clean up any previously active native recording object
    if (nativeRecordingRef.current) {
      try {
        await nativeRecordingRef.current.stopAndUnloadAsync();
      } catch {}
      nativeRecordingRef.current = null;
    }

    // 1. Microphone permission & Web Recorder
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatusMessage("⚠️ Audio recording not supported in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        let mimeType = "audio/webm";
        if (typeof (window as any).MediaRecorder !== "undefined") {
          if ((window as any).MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mimeType = "audio/webm;codecs=opus";
          } else if ((window as any).MediaRecorder.isTypeSupported("audio/mp4")) {
            mimeType = "audio/mp4";
          }
          const recorder = new (window as any).MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (e: any) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(200); // 200ms chunk slices
          mediaRecorderRef.current = recorder;
        }
        setIsListening(true);
        setStatusMessage("🎙️ Recording live audio... Speak your instruction now.");
      } catch (err: any) {
        console.warn("Microphone access error:", err);
        setIsListening(false);
        setStatusMessage("⚠️ Microphone permission denied. Please allow microphone access in your browser settings.");
        return;
      }

      // Start Web Speech recognition for live text display if supported
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.warn("Web Speech recognition warning:", err);
        }
      }
    } else {
      // Native Android / iOS via expo-av
      try {
        const { Audio } = require("expo-av");
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setStatusMessage("⚠️ Microphone permission not granted. Please allow microphone access in device settings.");
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        nativeRecordingRef.current = recording;
        setIsListening(true);
        setStatusMessage("🎙️ Recording mobile audio... Speak your instruction now.");
      } catch (nativeErr: any) {
        console.warn("Native audio recording init warning:", nativeErr);
        setIsListening(true);
        setStatusMessage("🎙️ Speak your directive or edit the text box below.");
      }
    }
  };

  const stopRecordingSession = async (): Promise<string | null> => {
    setIsListening(false);
    let nativeRecordedUri: string | null = null;

    // Web MediaRecorder
    if (mediaRecorderRef.current && typeof mediaRecorderRef.current.stop === "function" && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch {}
    }

    // Native expo-av recorder
    if (nativeRecordingRef.current && Platform.OS !== "web") {
      try {
        const status = await nativeRecordingRef.current.getStatusAsync();
        if (status.canRecord || status.isRecording) {
          await nativeRecordingRef.current.stopAndUnloadAsync();
        }
        nativeRecordedUri = nativeRecordingRef.current.getURI();
      } catch (nativeStopErr) {
        console.warn("Native stop recording error:", nativeStopErr);
      } finally {
        nativeRecordingRef.current = null;
      }
    }

    // Web Speech
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    return nativeRecordedUri;
  };

  const toggleMicListening = async () => {
    if (isListening) {
      const nativeUri = await stopRecordingSession();
      setIsAnalyzing(true);
      setStatusMessage("⚡ Transcribing audio with Groq Whisper & Gemini...");

      let textToAnalyze = inputText.trim();

      // 1. Try transcribing recorded audio if transcript is empty
      if (!textToAnalyze) {
        if (Platform.OS === "web" && audioChunksRef.current.length > 0) {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const whisperTranscript = await transcribeVoiceAudio(audioBlob);
            if (whisperTranscript && whisperTranscript.trim()) {
              textToAnalyze = whisperTranscript.trim();
              setInputText(textToAnalyze);
            }
          } catch (whisperErr) {
            console.warn("Web Whisper chunk transcription fallback:", whisperErr);
          }
        } else if (nativeUri) {
          try {
            const whisperTranscript = await transcribeNativeAudioFile(nativeUri);
            if (whisperTranscript && whisperTranscript.trim()) {
              textToAnalyze = whisperTranscript.trim();
              setInputText(textToAnalyze);
            }
          } catch (whisperErr) {
            console.warn("Native Whisper transcription fallback:", whisperErr);
          }
        }
      }

      if (!textToAnalyze) {
        setIsAnalyzing(false);
        setStatusMessage("⚠️ No speech detected. Please tap mic again or type your directive.");
        return;
      }

      await triggerAutoAnalyze(textToAnalyze);
    } else {
      await startRecordingSession();
    }
  };

  const triggerAutoAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    setStatusMessage("⚡ Analyzing directive & identifying team recipient with Gemini...");
    try {
      const data = await analyzeVoiceDirective(text, senderName || "Admin", teamCode);
      setAnalysisResult(data);
      if (data.extracted_task?.owner_id) {
        setSelectedOwnerId(data.extracted_task.owner_id);
      }
      setStatusMessage("");
    } catch (err: any) {
      setStatusMessage(`❌ Notice: ${err?.message || "Could not analyze directive"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndSend = async () => {
    if (!analysisResult?.extracted_task) return;
    const task = analysisResult.extracted_task;
    setIsSending(true);
    try {
      const targetOwnerId = selectedOwnerId || task.owner_id || (members[0] ? members[0].id : 1);
      const res = await confirmVoiceTransfer({
        title: task.title,
        owner_id: targetOwnerId,
        deadline_iso: task.deadline_iso,
        description: `Voice directive from ${senderName || "Admin"}: ${analysisResult.summary}`,
        priority: task.priority,
        team_code: teamCode,
      });
      setSuccessMessage(res.message || `✓ Task transferred to ${task.owner_name}!`);
      setStatusMessage("");
      if (onTaskCreated) onTaskCreated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage(`❌ Failed to send task: ${err?.message || "Server error"}`);
    } finally {
      setIsSending(false);
    }
  };

  // Quick Member directive chips
  const activeMembersList = members.slice(0, 3);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <AppIcon name="mic" size={18} color="#7c69ef" />
              </View>
              <View>
                <Text style={styles.title}>Voice Directive & Auto-Transfer</Text>
                <Text style={styles.subtitle}>
                  {teamCode ? `Workspace ${teamCode} · Autonomous Routing` : "Autonomous Incident & Task Routing"}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" size={18} color="#9aa5b8" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Glowing Mic Hero Button */}
            <View style={styles.micSection}>
              <TouchableOpacity
                style={[styles.bigMicBtn, isListening && styles.bigMicBtnActive]}
                onPress={toggleMicListening}
                activeOpacity={0.8}
              >
                <AppIcon name="mic" size={34} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.micStatusLabel}>
                {isListening ? "🔴 Recording... Tap to Stop & Auto-Transfer" : "Tap Mic to Record Directive"}
              </Text>
              {isListening && (
                <View style={styles.recordingPill}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingPillText}>Capturing live audio chunks...</Text>
                </View>
              )}
            </View>

            {/* Quick Member Presets */}
            {!analysisResult && (
              <View style={styles.presetsRow}>
                {activeMembersList.length > 0 ? (
                  activeMembersList.map((m, idx) => (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.presetChip}
                      onPress={() => {
                        const txt =
                          idx === 0
                            ? `${m.name}, review backend database security audit by Friday.`
                            : idx === 1
                            ? `${m.name}, verify mobile auth flow and responsive screens.`
                            : `${m.name}, check server alerts and deploy updates tomorrow.`;
                        setInputText(txt);
                        triggerAutoAnalyze(txt);
                      }}
                    >
                      <Text style={styles.presetText}>{m.name.split(" ")[0]} Directive</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        const txt = "Team, review security audit by Friday.";
                        setInputText(txt);
                        triggerAutoAnalyze(txt);
                      }}
                    >
                      <Text style={styles.presetText}>Security Audit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        const txt = "Team, server load is high, deploy hotfix.";
                        setInputText(txt);
                        triggerAutoAnalyze(txt);
                      }}
                    >
                      <Text style={styles.presetText}>Critical Hotfix</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Transcribed Speech Box */}
            <View style={styles.inputBox}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={styles.inputLabel}>Voice Directive Transcript:</Text>
                {inputText ? (
                  <TouchableOpacity onPress={() => setInputText("")}>
                    <Text style={{ color: "#7c69ef", fontSize: 11, fontWeight: "700" }}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Spoken directive will appear here in real-time..."
                placeholderTextColor="#687385"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
            </View>

            {/* Status / Loading Message */}
            {isAnalyzing && (
              <View style={styles.analyzingBox}>
                <ActivityIndicator size="small" color="#7c69ef" />
                <Text style={styles.analyzingText}>AI is summarizing and identifying target recipient...</Text>
              </View>
            )}

            {statusMessage && !isAnalyzing ? (
              <Text style={styles.statusText}>{statusMessage}</Text>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <AppIcon name="shield" size={16} color="#22c55e" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* DIRECTIVE TRANSFER PREVIEW CARD */}
            {analysisResult?.extracted_task && !successMessage && (() => {
              const task = analysisResult.extracted_task;
              if (!task) return null;
              const currentOwner = members.find((m) => m.id === selectedOwnerId) || {
                id: task.owner_id,
                name: task.owner_name,
                role: task.owner_role,
              };
              return (
                <View style={styles.transferPreviewCard}>
                  <View style={styles.transferHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppIcon name="arrow-forward" size={15} color="#7c69ef" />
                      <Text style={styles.transferTitle}>Transferring Task</Text>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>
                        {task.priority.toUpperCase()} PRIORITY
                      </Text>
                    </View>
                  </View>

                  {/* Target Recipient Row */}
                  <View style={styles.recipientRow}>
                    <View style={styles.recipientAvatar}>
                      <Text style={styles.recipientAvatarText}>
                        {currentOwner.name[0]?.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipientLabel}>TRANSFER TO</Text>
                      <Text style={styles.recipientName}>{currentOwner.name}</Text>
                      <Text style={styles.recipientRole}>{currentOwner.role}</Text>
                    </View>
                  </View>

                  {/* Team Member Switcher Chips */}
                  {members.length > 1 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {members.map((m) => {
                        const isSelected = selectedOwnerId === m.id || (!selectedOwnerId && task.owner_id === m.id);
                        return (
                          <TouchableOpacity
                            key={m.id}
                            onPress={() => setSelectedOwnerId(m.id)}
                            style={{
                              backgroundColor: isSelected ? "#7c69ef" : "#202336",
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: isSelected ? "#7c69ef" : "#30344d",
                            }}
                          >
                            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>{m.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Structured Task & Deadline */}
                  <View style={styles.taskDetailBlock}>
                    <Text style={styles.detailLabel}>ACTION ITEM</Text>
                    <Text style={styles.taskTitleText}>{analysisResult.extracted_task.title}</Text>

                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>EXECUTIVE SUMMARY</Text>
                    <Text style={styles.summaryText}>{analysisResult.summary}</Text>

                    <View style={styles.deadlineContainer}>
                      <Text style={styles.deadlineLabel}>⏰ DUE DATE:</Text>
                      <Text style={styles.deadlineValue}>{analysisResult.extracted_task.deadline_str}</Text>
                    </View>
                  </View>

                  {/* Admin Action Buttons */}
                  <View style={styles.confirmActionRow}>
                    <TouchableOpacity
                      style={[styles.sendBtn, isSending && styles.btnDisabled]}
                      onPress={handleConfirmAndSend}
                      disabled={isSending}
                      activeOpacity={0.8}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <AppIcon name="send" size={16} color="#ffffff" />
                          <Text style={styles.sendBtnText}>
                            ✓ Send & Assign to {currentOwner.name.split(" ")[0]}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.discardBtn}
                      onPress={() => {
                        setAnalysisResult(null);
                        setSelectedOwnerId(null);
                        setInputText("");
                        setStatusMessage("Ready to record another directive.");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.discardBtnText}>Discard / Re-record</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* Manual Trigger if transcript is edited manually */}
            {!analysisResult && !isListening && inputText.trim().length > 0 && (
              <TouchableOpacity
                style={styles.manualProcessBtn}
                onPress={() => triggerAutoAnalyze(inputText.trim())}
                activeOpacity={0.8}
              >
                <AppIcon name="arrow-forward" size={15} color="#ffffff" />
                <Text style={styles.manualProcessBtnText}>Analyze & Route Directive</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: "#161822",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#262938",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    backgroundColor: "rgba(124, 105, 239, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 11,
    color: "#9aa5b8",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  micSection: {
    alignItems: "center",
    marginVertical: 12,
  },
  bigMicBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#7c69ef",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c69ef",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  bigMicBtnActive: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    transform: [{ scale: 1.08 }],
  },
  micStatusLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  recordingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  recordingPillText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
    justifyContent: "center",
  },
  presetChip: {
    backgroundColor: "#202336",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30344d",
  },
  presetText: {
    color: "#a7b2c7",
    fontSize: 12,
    fontWeight: "700",
  },
  inputBox: {
    backgroundColor: "#0d0e15",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#282c40",
    marginBottom: 12,
  },
  inputLabel: {
    color: "#9aa5b8",
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    minHeight: 52,
    textAlignVertical: "top",
  },
  analyzingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(124, 105, 239, 0.15)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  analyzingText: {
    color: "#c4b5fd",
    fontSize: 12,
    fontWeight: "700",
  },
  statusText: {
    color: "#9aa5b8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    marginBottom: 12,
  },
  successText: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  transferPreviewCard: {
    backgroundColor: "#1b1e2c",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#373c59",
    marginTop: 4,
    marginBottom: 10,
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2f45",
    paddingBottom: 8,
  },
  transferTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  priorityBadge: {
    backgroundColor: "rgba(124, 105, 239, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeText: {
    color: "#a797ff",
    fontSize: 10,
    fontWeight: "800",
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#12141f",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  recipientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#7c69ef",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  recipientLabel: {
    color: "#858e9f",
    fontSize: 9,
    fontWeight: "800",
  },
  recipientName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  recipientRole: {
    color: "#a7b2c7",
    fontSize: 11,
  },
  taskDetailBlock: {
    backgroundColor: "#12141f",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  detailLabel: {
    color: "#7e889b",
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 2,
  },
  taskTitleText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  summaryText: {
    color: "#c5cce0",
    fontSize: 11,
    lineHeight: 16,
  },
  deadlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#22263a",
  },
  deadlineLabel: {
    color: "#9aa5b8",
    fontSize: 10,
    fontWeight: "700",
  },
  deadlineValue: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
  },
  confirmActionRow: {
    gap: 8,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  discardBtn: {
    alignItems: "center",
    paddingVertical: 9,
  },
  discardBtnText: {
    color: "#9aa5b8",
    fontSize: 12,
    fontWeight: "600",
  },
  manualProcessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c69ef",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
  },
  manualProcessBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
