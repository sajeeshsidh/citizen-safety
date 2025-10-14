import React from 'react';
import Svg, { Rect } from 'react-native-svg';

const PauseIcon: React.FC<{ width: number, height: number, color: string }> = ({ width, height, color }) => (
    <Svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill={color}
    >
        <Rect x="6" y="4" width="4" height="16" />
        <Rect x="14" y="4" width="4" height="16" />
    </Svg>
);

export default PauseIcon;