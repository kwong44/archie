import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import {
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { logger } from '@/lib/logger';

/**
 * @interface AffirmationAnimationProps
 * Props for the AffirmationAnimation component.
 */
interface AffirmationAnimationProps {
  /** The diameter of the animation container */
  size: number;
}

/**
 * An individual animated circle for the Seed of Life pattern.
 * Each circle animates its opacity to fade into view with a delay.
 *
 * @param {object} props - Component props.
 * @param {number} props.r - The radius of the circle.
 * @param {object} props.center - The center coordinates {x, y}.
 * @param {number} props.index - The animation index for staggering.
 * @returns {JSX.Element} An animated Skia circle.
 */
const SeedCircle: React.FC<{ r: number; center: { x: number; y: number }; index: number }> = ({
  r,
  center,
  index,
}) => {
  const opacity = useSharedValue<number>(0);

  /**
   * This effect starts the animation when the component mounts.
   * `withDelay` staggers the animation for each circle.
   * `withTiming` controls the fade-in duration.
   */
  useEffect(() => {
    logger.debug('Animating Seed of Life circle', { index });
    opacity.value = withDelay(
      index * 120, // Stagger each circle's appearance
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
      })
    );
  }, [index, opacity]);

  return (
    <Circle
      cx={center.x}
      cy={center.y}
      r={r}
      style="stroke"
      strokeWidth={2.5}
      color="#FFC300"
      opacity={opacity}
    />
  );
};

/**
 * AffirmationAnimation Component
 * Renders the "Seed of Life" sacred geometry pattern.
 * This pattern consists of seven overlapping circles of the same radius.
 * The animation blooms from the center outwards.
 */
export const AffirmationAnimation: React.FC<AffirmationAnimationProps> = ({ size }) => {
  /**
   * `useMemo` is used to calculate the coordinates of the circles once.
   * This prevents recalculation on every render.
   */
  const geometry = useMemo(() => {
    logger.info('Calculating Seed of Life geometry', { size });

    // The stroke is centered on the radius, so we need to account for half of it
    // on the outside to prevent clipping.
    const strokeWidth = 2.5;
    const padding = strokeWidth / 2;
    
    // The effective radius is based on the container size minus padding
    const r = (size / 2 - padding) / 2;
    const centerX = size / 2;
    const centerY = size / 2;

    const coords = [{ x: centerX, y: centerY }]; // Central circle

    // Calculate the 6 surrounding circles
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3; // 60-degree increments
      coords.push({
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      });
    }
    return { coords, r };
  }, [size]);

  return (
    <Canvas style={styles.canvas}>
      {geometry.coords.map((center, index) => (
        <SeedCircle key={index} center={center} r={geometry.r} index={index} />
      ))}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    height: '100%',
  },
}); 