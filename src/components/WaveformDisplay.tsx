import './WaveformDisplay.css';
import { useRef, useEffect } from 'react';

export default function WaveformDisplay({ loadDefaultAudio, currentFile }) {
	const audioRef = useRef(null);

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