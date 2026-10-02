import { Stack } from 'expo-router';

/** Logged-out area: login and OTP (PRD S2, S3). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
