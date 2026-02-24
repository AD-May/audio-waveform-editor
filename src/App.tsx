import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, type ChangeEvent } from 'react';
import { useAudioContext } from './hooks/useAudioContext.tsx';
import { useWaveformData } from './hooks/useWaveformData.tsx';
import { usePlayback } from './hooks/usePlayback.tsx';
// TODO Move related state to reducer or custom hooks, add try/catch error handling, and add unit/integration tests

const SVG_DIMENSIONS = {
	height: 500,
	width: 700,
};

export default function App() {
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [selection, setSelection] = useState<Array<number | null> | null>(null);
    // const [audioNodes, setAudioNodes] = useState<Node[]>([]);
    const [currentSetting, setCurrentSetting] = useState<string>("")
    // const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
    // const [playing, setPlaying] = useState<boolean>(false);
    const audioDurationRef = useRef<number | null>(null);
    const audioContext = useAudioContext();
    const { audioData, visualData, modifySelectionData } = useWaveformData(currentFile, audioContext, selection, audioDurationRef);
    const {
		currentPlaybackTime,
		setCurrentPlaybackTime,
		playing,
		setPlaying,
		seek,
		panAudio,
		changeVolume,
	} = usePlayback(
		audioData,
		audioContext,
		selection,
		modifySelectionData,
		audioDurationRef,
	);

    function checkNullSelection(): boolean {
            let hasNull = true;
            if (selection) {
                hasNull = selection.some(
                    (element) => element === null || element === undefined,
                );
            }
            return hasNull;
    }

    async function loadDefaultAudio(): Promise<void> {
		const DEFAULT_AUDIO_URL = "/assets/default-audio[for-p].mp3";
		try {
			const response = await fetch(DEFAULT_AUDIO_URL);
			const audioBlob = await response.blob();
			const file = new File([audioBlob], "default-song.mp3", {
				type: "audio/mpeg",
			});
			setCurrentFile(file);
		} catch (error) {
			console.error("Issue fetching default audio: ", error);
		}
	}

    function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = samples.length * (bitsPerSample / 8);
        const headerSize = 44;
        const buffer = new ArrayBuffer(headerSize + dataSize);
        const view = new DataView(buffer);

        // RIFF header
        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, "WAVE");

        // fmt chunk
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // data chunk
        writeString(view, 36, "data");
        view.setUint32(40, dataSize, true);

        // Convert float samples to 16-bit PCM
        const offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const clamped = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset + i * 2, clamped * 0x7FFF, true);
        }

        return new Blob([buffer], { type: "audio/wav" });
    }

    function writeString(view: DataView, offset: number, str: string): void {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    function getDownloadURL(e: React.MouseEvent): void {
        const target = e.target as HTMLAnchorElement;
        if (!audioData || !audioContext) return;
        const audioBlob = encodeWAV(audioData, audioContext.sampleRate);
        const audioURL = URL.createObjectURL(audioBlob);
        setTimeout(() => URL.revokeObjectURL(audioURL), 1000);
        target.href = audioURL;
    }

    function handleEdit(e: ChangeEvent): void {
            const target = e.target as HTMLInputElement;
            const currentValue = Number(target.value);
            switch (currentSetting) {
                case "Balance":
                    target.max = "1";
                    target.min = "-1";
                    target.step = ".25";
                    panAudio(currentValue);
                    break;
                case "Gain":
                    target.max = "2";
                    target.min = "0";
                    target.step = ".20";
                    changeVolume(currentValue);
                    break;
                case "Trim":
                    modifySelectionData();
            }
    }

    function getXAudioTime(xPosition: number): number {
        const percentSeeked = xPosition / SVG_DIMENSIONS.width;
        return audioDurationRef.current! * percentSeeked;
    }

    return (
        <>
        <header>
            <h1 className="display-1">Audio Waveform Editor</h1>
            <Tooltip 
                setFile={setCurrentFile} // Extract this file logic out to custom hook (useSetFile)
                audioContext={audioContext}
                getDownloadURL={getDownloadURL}
                currentSetting={currentSetting}
                setCurrentSetting={setCurrentSetting} 
                handleEdit={handleEdit}
                invalidSelection={checkNullSelection}
                setPlaying={setPlaying}
            />
        </header>
        <main>
            <WaveformDisplay 
                loadDefaultAudio={loadDefaultAudio} 
                audioData={visualData}
                selection={selection}
                setSelection={setSelection}
                nullSelection={checkNullSelection}
                getAudioTime={getXAudioTime}
                currentTime={currentPlaybackTime}
                setCurrentTime={setCurrentPlaybackTime}
                audioDurationRef={audioDurationRef}
                audioContext={audioContext}
                seek={seek}
                playing={playing}
            />
        </main>
        <footer>
            Created by <i>Alex M</i>
        </footer>
        </>
    )
}
