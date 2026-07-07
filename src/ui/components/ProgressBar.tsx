// [UI] Processing progress bar — design/DESIGN-SPEC.md §5.12 / §1d. 200×8, blue
// fill on a line-colored track. The `cdfbar` keyframe (8%→74%→92% over 2.2s)
// can't map 1:1 to RN, so we animate to ~92% and let the caller snap to 100%
// when render completes ("fast-feeling, never stuck at 99%").

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function ProgressBar({ done = false }: { done?: boolean }) {
  const progress = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    if (done) {
      Animated.timing(progress, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      return;
    }
    // Crawl to ~92% over 2.2s, matching the cdfbar shape's endpoint.
    Animated.timing(progress, {
      toValue: 0.92,
      duration: 2200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [done, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 200,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.trustBlue },
});
