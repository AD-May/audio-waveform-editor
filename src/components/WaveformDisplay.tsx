import './WaveformDisplay.css';
import { useRef, useState, useEffect } from 'react';

export default function WaveformDisplay({ loadDefaultAudio, currentFile, currentSettingInfo }) {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
	const audioRef = useRef(null);

    console.log(currentSettingInfo);

    useEffect(() => {
        const audioContext = new AudioContext();
        setAudioContext(audioContext);

        return () => {
            audioContext.close();
        }
    }, [currentFile])

	// // TODO: With the audio context created, use createMediaElementSource on it passing in an <audio> element
    // function create

	// useEffect()

	// if (currentFile) {
	// 	// create AudioContext
	// }

	function getArrayBuffer(): Promise<ArrayBuffer | void> {
		const reader = new FileReader();
		const resultPromise: Promise<ArrayBuffer | void> = new Promise(
			(resolve, reject) => {
				reader.readAsArrayBuffer(currentFile);
				reader.addEventListener("loadend", () => {
					if (!reader.result) {
						reject(
							new Error(
								"FileReader could not convert file data to an ArrayBuffer."
							),
						);
					}
					resolve(reader.result as ArrayBuffer);
				});
			},
		);
		return resultPromise;
	}

    async function getAudioBuffer(): Promise<AudioBuffer | undefined> {
        const audioBuffer = await audioContext?.decodeAudioData(await getArrayBuffer() as ArrayBuffer);
        if (!audioBuffer) {
            console.error("Could not convert audio ArrayBuffer to AudioBuffer.");
        };
        
        return audioBuffer;
    }

    async function getWaveformData(): Promise<Float32Array | undefined> {
        const audioBuffer = await getAudioBuffer();
        return audioBuffer?.getChannelData(0);
    }
    
    //TODO: Take data from getWaveformData and render it to svg with D3.js
    async function testWaveformData() {
        const waveformData = await getWaveformData();
        console.log(waveformData);
    }
  
    testWaveformData();

	return (
		<div className="waveformDisplay">
			<audio ref={audioRef}></audio>
			{!currentFile && (
				<button className="defaultAudioBtn" onClick={loadDefaultAudio}>
					Load Default Audio
				</button>
			)}
		</div>
	);
}