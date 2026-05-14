import { Redirect } from 'expo-router';

/** Fallback: если кто-то прямой переход на /(tabs)/post — отправим на модал создания. */
export default function PostTabScreen() {
  return <Redirect href="/new-post" />;
}
