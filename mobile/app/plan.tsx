import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../src/theme";
import { membersData, initialPlanItems, PlanItem } from "../src/data";

export default function PlanScreen() {
  const [plans, setPlans] = useState<PlanItem[]>(initialPlanItems);

  const toggleComplete = (id: string) => {
    setPlans((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconBtnRound}
              onPress={() => router.back()}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtnRound}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          {/* Time Badge */}
          <View style={styles.timeBadgeRow}>
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>11:30 AM - 12:00 PM</Text>
            </View>
          </View>

          {/* Title Block */}
          <View style={styles.titleBlock}>
            <Text style={styles.mainTitle}>Team Meeting</Text>
            <Text style={styles.subtitle}>Discussion of tasks for the month</Text>
          </View>

          {/* Attendees Avatar Stack */}
          <View style={styles.attendeesRow}>
            <Image
              source={{ uri: membersData[0].avatar }}
              style={[styles.attendeeAvatar, { marginLeft: 0 }]}
            />
            <Image
              source={{ uri: membersData[1].avatar }}
              style={styles.attendeeAvatar}
            />
            <Image
              source={{ uri: membersData[2].avatar }}
              style={styles.attendeeAvatar}
            />
            <View style={styles.attendeeMoreBadge}>
              <Text style={styles.attendeeMoreText}>+5</Text>
            </View>
          </View>

          {/* Plan Section */}
          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Plan</Text>

            <View style={styles.planCardsList}>
              {plans.map((item) => {
                const getCardBg = () => {
                  if (item.color === "purple") return colors.purple;
                  if (item.color === "yellow") return colors.yellow;
                  return colors.pink;
                };

                const isDarkText = item.color === "yellow";

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.planCard,
                      { backgroundColor: getCardBg() },
                      item.completed && styles.planCardCompleted,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleComplete(item.id)}
                  >
                    <Text
                      style={[
                        styles.planCardText,
                        isDarkText ? styles.textDark : styles.textWhite,
                        item.completed && styles.strikeThrough,
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={[
                        styles.planCardTime,
                        isDarkText ? styles.textDark : styles.textWhite,
                      ]}
                    >
                      {item.timeRange}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  iconBtnRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textMain,
  },
  editIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textMain,
  },
  timeBadgeRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  timePill: {
    backgroundColor: colors.darkPill,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  timePillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textMain,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  attendeesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ffffff",
    marginLeft: -10,
  },
  attendeeMoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.darkPill,
    borderWidth: 2,
    borderColor: "#ffffff",
    marginLeft: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeMoreText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  planSection: {
    gap: 14,
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textMain,
  },
  planCardsList: {
    gap: 12,
  },
  planCard: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planCardCompleted: {
    opacity: 0.6,
  },
  planCardText: {
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 190,
    lineHeight: 18,
  },
  planCardTime: {
    fontSize: 11,
    fontWeight: "700",
  },
  textWhite: {
    color: "#ffffff",
  },
  textDark: {
    color: colors.textMain,
  },
  strikeThrough: {
    textDecorationLine: "line-through",
  },
});
