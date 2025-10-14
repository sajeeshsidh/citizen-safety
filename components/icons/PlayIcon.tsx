import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PlayIconProps {
    width: number;
    height: number;
    color: string;
}

export default function PlayIcon({ width, height, color }: PlayIconProps) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill={color}
        >
            <Path d="M8 5v14l11-7z" />
        </Svg>
    );
}
