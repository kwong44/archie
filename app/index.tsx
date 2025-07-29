import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  // This will redirect to the auth flow
  return <Redirect href="/(auth)" />;
}
