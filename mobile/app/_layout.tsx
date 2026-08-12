import { Stack } from "expo-router";
import { colors } from "../src/theme";
export default function Layout() { return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink, headerShadowVisible: false, contentStyle: { backgroundColor: colors.canvas } }}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="inbox" options={{title:"TeamOps"}}/><Stack.Screen name="tasks" options={{title:"Today's tasks"}}/></Stack>; }
