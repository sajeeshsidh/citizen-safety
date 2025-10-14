import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

const MicrophoneIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></Path>
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2"></Path>
    <Line x1="12" y1="19" x2="12" y2="23"></Line>
    <Line x1="8" y1="23" x2="16" y2="23"></Line>
  </Svg>
);

export default MicrophoneIcon;
