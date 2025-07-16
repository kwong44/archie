import React from 'react';
import { Svg, Path, G } from 'react-native-svg';

/**
 * GoogleLogoIcon Component
 * Renders the official Google 'G' logo as an SVG icon.
 * This component is designed to be used in the Google sign-in button
 * to provide an authentic and recognizable user experience.
 * The SVG paths are from Google's official branding assets.
 * 
 * @param {object} props - Component props.
 * @param {number} [props.width=20] - The width of the SVG icon.
 * @param {number} [props.height=20] - The height of the SVG icon.
 */
const GoogleLogoIcon = ({ width = 20, height = 20 }) => (
  <Svg width={width} height={height} viewBox="0 0 18 18">
    <G fill="none" fillRule="evenodd">
      <Path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8441 2.0782-1.7959 2.7218v2.2582h2.9087c1.7018-1.5668 2.6836-3.875 2.6836-6.621z"
        fill="#4285F4"
      />
      <Path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2582c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9576v2.3318C2.4382 15.981 5.4818 18 9 18z"
        fill="#34A853"
      />
      <Path
        d="M3.964 10.71c-.18-.54-.18-1.11 0-1.65V6.7282H.9576C.3477 7.9632 0 9.4532 0 11.0332c0 1.58.3477 3.069.9576 4.304l3.0064-2.3318z"
        fill="#FBBC05"
      />
      <Path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.019.9576 4.9682L3.964 7.3c.7078-2.1272 2.692-3.7205 5.036-3.7205z"
        fill="#EA4335"
      />
    </G>
  </Svg>
);

export default GoogleLogoIcon; 