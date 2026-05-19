import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, Text, View } from 'react-native';
import { getAuthMediaUrl } from '../lib/api';
import { colors, fontSize } from '../lib/theme';

interface AuthImageProps {
  sourcePath: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export default function AuthImage({ sourcePath, style, resizeMode = 'cover' }: AuthImageProps) {
  const [uri, setUri] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setFailed(false);
    getAuthMediaUrl(sourcePath).then((url) => {
      if (mounted) setUri(url);
    });
    return () => {
      mounted = false;
    };
  }, [sourcePath]);

  if (!uri) return <View style={[{ backgroundColor: colors.brandPale }, style]} />;
  if (failed) {
    return (
      <View style={[{ backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>фото</Text>
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />;
}
