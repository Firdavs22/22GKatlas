import { Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function ProgressTab() {
  const { user } = useAuth();

  if (user?.role === 'parent') return <Redirect href="/parent/progress" />;
  return <Redirect href="/home" />;
}
