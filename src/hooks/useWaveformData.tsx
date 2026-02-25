import { useState, useEffect, type RefObject } from 'react';
import type { SelectionBounds } from "../types/types.mts";

const SVG_DIMENSIONS = {
	height: 500,
	width: 700,
};

// TODO: Make sure URL path is corrected when we move .mjs file from build into dist dir
const downsampleWorker = new Worker(
	new URL("../utils/downsample.mjs", import.meta.url),
	{ type: 'module' }
);

const selectionWorker = new Worker(
    new URL("../utils/adjustSelection.mjs", import.meta.url),
    { type: 'module' }
);

const NUMBER_OF_SAMPLES = 4000;

export function useWaveformData(currentFile: File | null, audioContext: AudioContext | undefined, selection: (number | null)[] | null, audioDurationRef: RefObject<number | null>) {
    const [audioData, setAudioData] = useState<Float32Array | null>(null);
	const [visualData, setVisualData] = useState<Float32Array | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
            if (!currentFile || !audioContext) return;
    
            setIsLoading(true);
            async function getWaveformData(): Promise<void> {
                const audioBuffer = await initializeAudioBuffer();
                if (!audioBuffer) {
                    console.error("Could not convert AudioBuffer to channel data.");
                    return;
                }
                audioDurationRef.current = audioBuffer.duration;
                const waveformData = audioBuffer?.getChannelData(0);
                const cleanedData = getCleanData(waveformData);
                downsampleWorker.postMessage({
                    data: cleanedData,
                    targetLength: NUMBER_OF_SAMPLES,
                });
                setAudioData(waveformData);
            }
            getWaveformData();
    }, [currentFile, audioContext]);
    
        useEffect(() => {
            downsampleWorker.onmessage = (e) => {
                setVisualData(e.data);
                setIsLoading(false);
            };
    
            selectionWorker.onmessage = (e) => {
                if (e.data.type === "visual") {
                    setVisualData(e.data.data);
                    setIsLoading(false);
                } else if (e.data.type === "audio") {
                    const audioArray = new Float32Array(e.data.data);
                    setAudioData(audioArray);
                }
            };
    
    }, []);

    function getArrayBuffer(): Promise<ArrayBuffer | void> | Error {
		if (currentFile) {
			const reader = new FileReader();
			const resultPromise: Promise<ArrayBuffer | void> = new Promise(
				(resolve, reject) => {
					reader.readAsArrayBuffer(currentFile);
					reader.addEventListener("loadend", () => {
						if (!reader.result) {
							reject(
								new Error(
									"FileReader could not convert file data to an ArrayBuffer.",
								),
							);
						}
						resolve(reader.result as ArrayBuffer);
					});
				},
			);
			return resultPromise;
		}
		return new Error("No audio file currently uploaded.");
	}

	async function initializeAudioBuffer(): Promise<AudioBuffer | undefined | void> {
		if (currentFile) {
			const audioBuffer = await audioContext?.decodeAudioData(
				(await getArrayBuffer()) as ArrayBuffer,
			);
			if (!audioBuffer) {
				console.error(
					"Could not convert audio ArrayBuffer to AudioBuffer.",
				);
			}
			return audioBuffer;
		}
	}

	function getCleanData(data: Float32Array): Float32Array {
		return data.filter((data) => data !== undefined);
	}

    function getBufferIndices(data: Float32Array): SelectionBounds | void {
        if (!selection || !selection[0] || !selection[1]) return;
        const startIndex = Math.round((selection[0] / SVG_DIMENSIONS.width) * data.length);
        const endIndex = Math.round((selection[1] / SVG_DIMENSIONS.width) * data.length);
        return { startIndex, endIndex };
    }

    function modifySelectionData(adjustmentValue?: number): void {
		if (!selection) return;
		const audioIndices = getBufferIndices(audioData!);
		const visualIndices = getBufferIndices(visualData!);

		selectionWorker.postMessage({
			indices: {
				startIndex: audioIndices?.startIndex,
				endIndex: audioIndices?.endIndex,
			},
			audioData: { type: "audio", data: audioData },
			adjustmentValue: adjustmentValue ?? undefined,
		});
		selectionWorker.postMessage({
			indices: {
				startIndex: visualIndices?.startIndex,
				endIndex: visualIndices?.endIndex,
			},
			audioData: { type: "visual", data: visualData },
			adjustmentValue: adjustmentValue ?? undefined,
		});
        setIsLoading(true);
	}

    return { audioData, visualData, isLoading, modifySelectionData,  };
}