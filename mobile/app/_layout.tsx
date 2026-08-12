import { Stack } from "expo-router";
import { colors } from "../src/theme";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgLight },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
