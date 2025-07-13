// SkiaArt.tsx
import React from 'react';
import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia';
import { useWindowDimensions } from 'react-native';

// GLSL code for our shader. This program runs on the GPU.
const source = Skia.RuntimeEffect.Make(`
  uniform float2 resolution;
  uniform float time;
  uniform float seed;

  // This is a classic function for generating pseudo-random numbers
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * (43758.5453123 + seed));
  }

  // Fractal Brownian Motion (fbm) - creates natural-looking noise
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
  }

  // The main function that returns the color for each pixel
  half4 main(vec2 fragCoord) {
    vec2 st = fragCoord.xy / resolution.xy;
    st.x *= resolution.x / resolution.y;

    // Start with a base color influenced by the seed
    vec3 color = vec3(0.0);
    color.r = random(vec2(seed * 0.1, 0.0));
    color.g = random(vec2(seed * 0.2, 0.0));
    color.b = random(vec2(seed * 0.3, 0.0));

    // Add layers of noise for a cloudy/aurora effect
    st *= 3.0; // Zoom
    float n = 0.0;
    n = noise(st * 1.0 + time * 0.1);
    n += 0.5 * noise(st * 2.0 + time * 0.2);
    n += 0.25 * noise(st * 4.0 + time * 0.3);
    n = pow(n, 1.2);

    // Mix the noise with the base color
    color = mix(color, vec3(n), 0.8);
    
    return half4(color, 1.0);
  }
`)!;

interface SkiaArtProps {
  /** A unique ID to seed the generative art */
  id: string;
}

export const SkiaArt: React.FC<SkiaArtProps> = ({ id }) => {
  const { width } = useWindowDimensions();
  // We derive a numeric seed from the entry ID string for our shader.
  // This ensures every card gets a unique pattern.
  const seed = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 1000) / 1000; // Normalize to 0-1
  }, [id]);

  return (
    <Canvas style={{ flex: 1, borderRadius: 16 }}>
      <Fill>
        {/*
          Pass uniforms as a prop to <Shader> instead of using a <Uniforms> component.
          This matches the Skia API and resolves the import/render error.
        */}
        <Shader
          source={source}
          uniforms={{
            resolution: [width, 300],
            time: 0, // You could animate this value for a moving effect!
            seed,
          }}
        />
      </Fill>
    </Canvas>
  );
};
