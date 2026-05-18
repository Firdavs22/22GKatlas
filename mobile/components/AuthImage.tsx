import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { getAuthMediaUrl } from '../lib/api';
import { colors } from '../lib/theme';

interface AuthImageProps {
  sourcePath: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export default function AuthImage({ sourcePath, style, resizeMode = 'cover' }: AuthImageProps) {
  const [uri, setUri] = useState('');

  useEffect(() => {
    let mounted = true;
    getAuthMediaUrl(sourcePath).then((url) => {
      if (mounted) setUri(url);
    });
    return () => {
      mounted = false;
    };
  }, [sourcePath]);

  if (!uri) return <View style={[{ backgroundColor: colors.brandPale }, style]} />;

  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
