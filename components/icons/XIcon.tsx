import React from 'react';
import Svg, { Path } from 'react-native-svg';

const XIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
  <Svg 
    width={width}
    height={height}
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke={color} 
  >
    <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </Svg>
);

export default XIcon;
