import React from 'react';
import Svg, { Path } from 'react-native-svg';

const PencilIcon: React.FC<{ width: number, height: number, color: string }> = ({ width, height, color }) => (
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
        <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Svg>
);

export default PencilIcon;