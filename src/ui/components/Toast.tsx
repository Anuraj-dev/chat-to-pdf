// [UI] Toast — design/DESIGN-SPEC.md §5.9 / §1g #1. Dark pill anchored above the
// bottom CTA. Auto-dismisses; fades in/out. Used on Home for empty-clipboard.

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

export function Toast({
  message,
  visible,
  onHide,
  duration = 3200,
}: {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => onHide());
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, opacity, onHide]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 92,
    backgroundColor: colors.toastBg,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  text: { color: colors.card, fontSize: 14.5, lineHeight: 21, fontWeight: '500' },
});
