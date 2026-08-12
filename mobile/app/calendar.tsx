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
import { membersData } from "../src/data";

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(21);

  const days = [
    { num: 18, day: "Mon" },
    { num: 19, day: "Tue" },
    { num: 20, day: "Wed" },
    { num: 21, day: "Thu" },
    { num: 22, day: "Fri" },
    { num: 23, day: "Sat" },
    { num: 24, day: "Sun" },
  ];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconBtnRound}
              onPress={() => router.back()}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Calendar</Text>

            <TouchableOpacity style={styles.iconBtnRound}>
              <Text style={styles.menuDots}>⋮</Text>
            </TouchableOpacity>
          </View>

          {/* Month Label */}
          <Text style={styles.monthLabel}>August</Text>

          {/* Date Strip */}
          <View style={styles.dateStrip}>
            {days.map((d) => (
              <TouchableOpacity
                key={d.num}
                style={[
                  styles.dateCapsule,
                  selectedDay === d.num && styles.dateCapsuleActive,
                ]}
                onPress={() => setSelectedDay(d.num)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNum,
                    selectedDay === d.num && styles.textWhite,
                  ]}
                >
                  {d.num}
                </Text>
                <Text
                  style={[
                    styles.dayName,
                    selectedDay === d.num && styles.textWhite,
                  ]}
                >
                  {d.day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timeline List */}
          <View style={styles.timelineList}>
            {/* 09.00 AM Row */}
            <View style={styles.timelineRow}>
              <Text style={styles.timeLabel}>09.00 AM</Text>
              <View style={[styles.eventCard, styles.eventCardPink]}>
                <View style={styles.eventTop}>
                  <View>
                    <Text style={[styles.eventTitle, styles.textWhite]}>
                      Research Plan
                    </Text>
                    <Text style={[styles.eventTime, styles.textWhite]}>
                      🕒 09.30-10.45
                    </Text>
                  </View>
                  <Text style={[styles.cardDots, styles.textWhite]}>⋮</Text>
                </View>

                <View style={styles.eventBottom}>
                  <Text style={[styles.assignedLabel, styles.textWhite]}>
                    Assigned to
                  </Text>
                  <View style={styles.userRow}>
                    <Image
                      source={{ uri: membersData[1].avatar }}
                      style={styles.miniAvatar}
                    />
                    <Text style={[styles.userName, styles.textWhite]}>
                      Wade Warren
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 11.00 AM Row with Active Time Badge */}
            <View style={styles.timelineRow}>
              <View style={styles.timeBadgeContainer}>
                <View style={styles.activeTimeBadge}>
                  <Text style={styles.activeTimeBadgeText}>11:30 AM</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.eventCard, styles.eventCardYellow]}
                activeOpacity={0.9}
                onPress={() => router.push("/plan")}
              >
                <View style={styles.eventTop}>
                  <View>
                    <Text style={styles.eventTitle}>Team Meeting</Text>
                    <Text style={styles.eventTime}>🕒 11.30-12.00</Text>
                  </View>
                  <Text style={styles.cardDots}>⋮</Text>
                </View>

                <View style={styles.eventBottom}>
                  <View style={styles.avatarStackMini}>
                    <Image
                      source={{ uri: membersData[0].avatar }}
                      style={[styles.stackImg, { marginLeft: 0 }]}
                    />
                    <Image
                      source={{ uri: membersData[2].avatar }}
                      style={styles.stackImg}
                    />
                    <Image
                      source={{ uri: membersData[3].avatar }}
                      style={styles.stackImg}
                    />
                    <View style={styles.stackMoreBadge}>
                      <Text style={styles.stackMoreText}>+3</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* 12.00 PM Row */}
            <View style={styles.timelineRow}>
              <Text style={styles.timeLabel}>12.00 PM</Text>
            </View>

            {/* 01.00 PM Row */}
            <View style={styles.timelineRow}>
              <Text style={styles.timeLabel}>01.00 PM</Text>
              <View style={[styles.eventCard, styles.eventCardBlue]}>
                <View style={styles.eventTop}>
                  <View>
                    <Text style={[styles.eventTitle, styles.textWhite]}>
                      Design Review on...
                    </Text>
                    <Text style={[styles.eventTime, styles.textWhite]}>
                      🕒 13.00-13.30
                    </Text>
                  </View>
                  <Text style={[styles.cardDots, styles.textWhite]}>⋮</Text>
                </View>

                <View style={styles.eventBottom}>
                  <Text style={[styles.assignedLabel, styles.textWhite]}>
                    Assigned to
                  </Text>
                  <View style={styles.userRow}>
                    <Image
                      source={{ uri: membersData[2].avatar }}
                      style={styles.miniAvatar}
                    />
                    <Text style={[styles.userName, styles.textWhite]}>
                      Leslie Alexander
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 02.30 PM Row */}
            <View style={styles.timelineRow}>
              <Text style={styles.timeLabel}>02.30 PM</Text>
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
    marginBottom: 12,
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
  backArrow: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textMain,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textMain,
  },
  menuDots: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textMain,
  },
  monthLabel: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 16,
  },
  dateStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  dateCapsule: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    width: 42,
  },
  dateCapsuleActive: {
    backgroundColor: colors.purple,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textMain,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
    marginTop: 2,
  },
  textWhite: {
    color: "#ffffff",
  },
  timelineList: {
    gap: 16,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timeLabel: {
    width: 60,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    paddingTop: 12,
  },
  timeBadgeContainer: {
    width: 60,
  },
  activeTimeBadge: {
    backgroundColor: colors.darkPill,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  activeTimeBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  eventCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 105,
    justifyContent: "space-between",
  },
  eventCardPink: {
    backgroundColor: colors.pink,
  },
  eventCardYellow: {
    backgroundColor: colors.yellow,
  },
  eventCardBlue: {
    backgroundColor: colors.blue,
  },
  eventTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textMain,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    color: colors.textMain,
  },
  cardDots: {
    fontSize: 16,
    color: colors.textMain,
  },
  eventBottom: {
    marginTop: 14,
  },
  assignedLabel: {
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.85,
    marginBottom: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  userName: {
    fontSize: 11,
    fontWeight: "700",
  },
  avatarStackMini: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    marginLeft: -6,
  },
  stackMoreBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.darkPill,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    marginLeft: -6,
    alignItems: "center",
    justifyContent: "center",
  },
  stackMoreText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
});
