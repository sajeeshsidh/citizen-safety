import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const PoliceBikeIcon: React.FC<{ width: number, height: number, color: string }> = ({ width, height, color }) => (
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
        <Circle cx="18.5" cy="17.5" r="3.5" />
        <Circle cx="5.5" cy="17.5" r="3.5" />
        <Path d="M12 18h.5" />
        <Path d="M15 18h-2" />
        <Path d="M10 18H6" />
        <Path d="M12 5l-3 5h6l-3-5z" />
        <Path d="M12 11V5" />
        <Path d="M7.5 14.5 5.5 11 12 5l6.5 6-2 3.5" />
    </Svg>
);

export default PoliceBikeIcon;
