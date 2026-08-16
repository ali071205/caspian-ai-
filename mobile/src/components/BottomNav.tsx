import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "./Icons";

interface BottomNavProps {
  activeTab: "home" | "calendar" | "team";
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === "home" && styles.navItemActive]}
          onPress={() => router.push("/")}
          activeOpacity={0.7}
        >
          <AppIcon
            name="home"
            variant={activeTab === "home" ? "filled" : "outline"}
            size={20}
            color={activeTab === "home" ? "#7c69ef" : "#8e8e93"}
          />
          <Text style={[styles.navText, activeTab === "home" && styles.navTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === "calendar" && styles.navItemActive]}
          onPress={() => router.push("/calendar")}
          activeOpacity={0.7}
        >
          <AppIcon
            name="library"
            variant={activeTab === "calendar" ? "filled" : "outline"}
            size={20}
            color={activeTab === "calendar" ? "#7c69ef" : "#8e8e93"}
          />
          <Text style={[styles.navText, activeTab === "calendar" && styles.navTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === "team" && styles.navItemActive]}
          onPress={() => router.push("/plan")}
          activeOpacity={0.7}
        >
          <AppIcon
            name="user"
            variant={activeTab === "team" ? "filled" : "outline"}
            size={20}
            color={activeTab === "team" ? "#7c69ef" : "#8e8e93"}
          />
          <Text style={[styles.navText, activeTab === "team" && styles.navTextActive]}>
            Team & Approvals
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#ececf2",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 22 : 12,
  },
  bar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#1c1b35",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 14,
    gap: 3,
  },
  navItemActive: {
    backgroundColor: "rgba(124, 105, 239, 0.2)",
  },
  navText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8e8e93",
  },
  navTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
