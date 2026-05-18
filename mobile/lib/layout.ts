import { useWindowDimensions } from 'react-native';
import { spacing } from './theme';

export const layout = {
  maxContentWidth: 640,
  tabBarSpacer: 104,
} as const;

export function useScreenLayout() {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? spacing.md : spacing.lg;
  const contentWidth = Math.min(width - horizontalPadding * 2, layout.maxContentWidth);

  return {
    width,
    isNarrow: width < 380,
    horizontalPadding,
    contentWidth,
  };
}
