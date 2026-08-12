import React from "react";
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

export default function HomeScreen() {
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
            <View style={styles.profileRow}>
              <Image
                source={{ uri: membersData[0].avatar }}
                style={styles.avatarMain}
              />
              <View>
                <Text style={styles.greetingText}>Good Morning !</Text>
                <Text style={styles.userName}>Antony Jacob</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>

          {/* Hero Title */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleLight}>You have 3</Text>
            <Text style={styles.heroTitleBold}>task for today</Text>
          </View>

          {/* Members Section */}
          <View style={styles.membersSection}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>8 Members</Text>
              <TouchableOpacity style={styles.addMemberBtn} activeOpacity={0.7}>
                <Text style={styles.addMemberPlus}>+</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.membersScroll}
            >
              {membersData.map((member) => (
                <Image
                  key={member.id}
                  source={{ uri: member.avatar }}
                  style={styles.memberAvatar}
                />
              ))}
            </ScrollView>
          </View>

          {/* Next Task Section */}
          <View style={styles.nextTaskSection}>
            <Text style={styles.nextTaskHeading}>Next Task</Text>

            <View style={styles.stackedCardWrapper}>
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() => router.push("/plan")}
              >
                <View style={styles.heroCardHeader}>
                  <Text style={styles.heroCardTitle}>Healthcare Dashboard UI</Text>
                  <Text style={styles.heroCardSubtitle}>Design Team</Text>
                </View>

                {/* Graphics / Illustration */}
                <View style={styles.illustrationArea}>
                  <View style={styles.isometricBox}>
                    <Text style={styles.sparkleIcon}>✨</Text>
                  </View>

                  <View style={[styles.bubble, styles.bubbleQ]}>
                    <Text style={styles.bubbleText}>?</Text>
                  </View>

                  <View style={[styles.bubble, styles.bubbleGlass]}>
                    <Text style={styles.bubbleText}>⌛</Text>
                  </View>

                  <View style={[styles.bubble, styles.bubbleHeart]}>
                    <Text style={styles.bubbleText}>♥</Text>
                  </View>
                </View>

                {/* Hero Card Bottom */}
                <View style={styles.heroCardBottom}>
                  <View style={styles.avatarStack}>
                    <Image
                      source={{ uri: membersData[2].avatar }}
                      style={[styles.stackAvatar, { marginLeft: 0 }]}
                    />
                    <Image
                      source={{ uri: membersData[3].avatar }}
                      style={styles.stackAvatar}
                    />
                    <Image
                      source={{ uri: membersData[5].avatar }}
                      style={styles.stackAvatar}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.actionArrowBtn}
                    onPress={() => router.push("/plan")}
                  >
                    <Text style={styles.arrowIcon}>↗</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Layered Card Depth Effect */}
              <View style={styles.cardDepthLayer} />
            </View>
          </View>
        </ScrollView>

        {/* Floating Bottom Nav Bar */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavBar}>
            <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
              <Text style={styles.navIconActive}>🏠</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => router.push("/calendar")}
            >
              <Text style={styles.navIcon}>📅</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navIcon}>🗂️</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarMain: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  greetingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  userName: {
    fontSize: 16,
    color: colors.textMain,
    fontWeight: "800",
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellIcon: {
    fontSize: 16,
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.redBadge,
  },
  heroTitleContainer: {
    marginBottom: 24,
  },
  heroTitleLight: {
    fontSize: 28,
    fontWeight: "400",
    color: colors.textMain,
    lineHeight: 34,
  },
  heroTitleBold: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textMain,
    lineHeight: 34,
  },
  membersSection: {
    marginBottom: 24,
  },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textMain,
  },
  addMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  addMemberPlus: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: -2,
  },
  membersScroll: {
    gap: 8,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  nextTaskSection: {
    marginBottom: 10,
  },
  nextTaskHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textMain,
    marginBottom: 14,
  },
  stackedCardWrapper: {
    position: "relative",
  },
  heroCard: {
    backgroundColor: colors.purple,
    borderRadius: 28,
    padding: 22,
    height: 250,
    justifyContent: "space-between",
    zIndex: 2,
    overflow: "hidden",
  },
  heroCardHeader: {
    maxWidth: 180,
  },
  heroCardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  heroCardSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  illustrationArea: {
    position: "absolute",
    right: 16,
    top: 20,
    width: 110,
    height: 130,
  },
  isometricBox: {
    width: 66,
    height: 66,
    backgroundColor: colors.yellow,
    borderRadius: 16,
    position: "absolute",
    right: 10,
    top: 15,
    transform: [{ rotate: "-12deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleIcon: {
    fontSize: 26,
  },
  bubble: {
    position: "absolute",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleQ: {
    width: 32,
    height: 32,
    left: -4,
    top: 10,
    backgroundColor: "#00CEBE",
  },
  bubbleGlass: {
    width: 28,
    height: 28,
    right: -4,
    top: -4,
    backgroundColor: "#ffffff",
  },
  bubbleHeart: {
    width: 26,
    height: 26,
    left: 12,
    bottom: 0,
    backgroundColor: "#FF2D55",
  },
  bubbleText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  heroCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    zIndex: 3,
  },
  avatarStack: {
    flexDirection: "row",
  },
  stackAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.purple,
    marginLeft: -8,
  },
  actionArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textMain,
  },
  cardDepthLayer: {
    position: "absolute",
    bottom: -8,
    left: 12,
    right: 12,
    height: 40,
    backgroundColor: colors.purpleLight,
    borderRadius: 24,
    zIndex: 1,
    opacity: 0.65,
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomNavBar: {
    backgroundColor: colors.darkPill,
    height: 60,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    width: "80%",
  },
  navItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  navItemActive: {
    backgroundColor: colors.purple,
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.7,
  },
  navIconActive: {
    fontSize: 18,
  },
});
