import React from 'react';
import Svg, { Path, Polyline, Line } from 'react-native-svg';

const UploadIcon: React.FC<{ width: number, height: number, color: string }> = ({ width, height, color }) => (
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
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <Polyline points="17 8 12 3 7 8" />
        <Line x1="12" y1="3" x2="12" y2="15" />
    </Svg>
);

export default UploadIcon;