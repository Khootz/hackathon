import { Redirect } from "expo-router";
import { useAuthStore } from "../store/authStore";

export default function Index() {
  const { session, role } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === "parent") {
    return <Redirect href="/(parent)" />;
  }

  return <Redirect href="/(student)" />;
}
