import { Stack } from 'expo-router';

/** Entry area: login and OTP (PRD S2, S3). */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
