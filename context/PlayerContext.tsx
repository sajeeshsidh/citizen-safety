// PlayerContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Text } from 'react-native';

// 1. Define the Context and custom hook
const PlayerContext = createContext<AudioPlayer | null>(null);

export const useAppAudioPlayer = (): AudioPlayer => {
    const player = useContext(PlayerContext);
    if (player === null) {
        throw new Error('useAppAudioPlayer must be used within a PlayerProvider');
    }
    return player;
};

// 2. Define the Provider component
export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [player, setPlayer] = useState<AudioPlayer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializePlayer = async () => {
            // 3. Create a single player instance
            const newPlayer = createAudioPlayer(null, { updateInterval: 500 });
            setPlayer(newPlayer);
            setIsLoading(false);
        };

        initializePlayer();

        // 4. Cleanup function to release the player when the provider is unmounted
        return () => {
            player?.remove(); // Use optional chaining to prevent errors if player is not yet defined
        };
    }, []); // Empty dependency array ensures this runs only once

    if (isLoading) {
        // Render a loading state until the player is initialized
        return <Text>Loading audio player...</Text>;
    }

    return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>;
};