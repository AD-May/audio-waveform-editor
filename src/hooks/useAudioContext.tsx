import { useState, useRef, useEffect } from 'react';

export function useAudioContext(): AudioContext | undefined {
    const [audioContext , setAudioContext] = useState<AudioContext | null>(null);
    const isAudioConnected = useRef<boolean>(false);

    useEffect(() => {
        if (isAudioConnected.current) return;

        const newAudioContext = new AudioContext();
        // Stop AudioContext from playing immediately
        newAudioContext.suspend();

        setAudioContext(newAudioContext);
        isAudioConnected.current = true;
    }, [])

    return audioContext!;
}
