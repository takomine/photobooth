"use client";

import { useRef, useCallback } from "react";

const AUDIO_FILES = {
    countdown_5: "/audio/countdown_5.mp3",
    countdown_4: "/audio/countdown_4.mp3",
    countdown_3: "/audio/countdown_3.mp3",
    countdown_2: "/audio/countdown_2.mp3",
    countdown_1: "/audio/countdown_1.mp3",
    capture: "/audio/capture.mp3",
    captured: "/audio/captured.mp3",
    start: "/audio/start.mp3",
    next: "/audio/next.mp3",
    complete: "/audio/complete.mp3",
    shutter: "/audio/shutter.mp3",
} as const;

export type AudioKey = keyof typeof AUDIO_FILES;

type UseKioskAudioReturn = {
    play: (key: AudioKey) => void;
    playCountdown: (value: number) => void;
    preload: () => void;
};

export function useKioskAudio(): UseKioskAudioReturn {
    const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Get or create audio element
    const getAudio = useCallback((key: AudioKey): HTMLAudioElement => {
        const cached = audioCache.current.get(key);
        if (cached) return cached;

        const audio = new Audio(AUDIO_FILES[key]);
        audio.preload = "auto";
        audioCache.current.set(key, audio);
        return audio;
    }, []);

    // Play a specific audio
    const play = useCallback((key: AudioKey) => {
        try {
            const audio = getAudio(key);
            audio.currentTime = 0;
            audio.play().catch((err) => {
                console.warn(`Audio playback failed for ${key}:`, err);
            });
        } catch (err) {
            console.warn(`Audio error for ${key}:`, err);
        }
    }, [getAudio]);

    // Play countdown based on value (5, 4, 3, 2, 1)
    const playCountdown = useCallback((value: number) => {
        if (value >= 1 && value <= 5) {
            play(`countdown_${value}` as AudioKey);
        }
    }, [play]);

    // Preload all audio files
    const preload = useCallback(() => {
        Object.keys(AUDIO_FILES).forEach((key) => {
            getAudio(key as AudioKey);
        });
    }, [getAudio]);

    return {
        play,
        playCountdown,
        preload,
    };
}
