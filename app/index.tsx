import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

/** The custom-scheme root must resolve for both saved and signed-out sessions. */
export default function AppEntry() {
  const { activationCode, isLoading } = useAuthStore();
  if (isLoading) return null;

  return <Redirect href={activationCode ? '/(home)/(tabs)/home' : '/welcome'} />;
}
