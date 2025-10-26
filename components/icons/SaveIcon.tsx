import React from 'react';
import Svg, { Path, Polyline } from 'react-native-svg';

const SaveIcon: React.FC<{ width: number, height: number, color: string }> = ({ width, height, color }) => (
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
        <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <Polyline points="17 21 17 13 7 13 7 21" />
        <Polyline points="7 3 7 8 15 8" />
    </Svg>
);

export default SaveIcon;