import './WaveformDisplay.css';
import { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

export default function WaveformDisplay({ loadDefaultAudio, currentFile, currentSettingInfo, audioContext }) {
	const [audioData, setAudioData] = useState<Float32Array|null>(null);
 	const audioRef = useRef<HTMLAudioElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const svgDimensions = {
		width: 800,
		height: 400,
	}
	const svgMargin = {
		top: 60,
		right: 20,
		bottom: 60,
		left: 20,
	};

	interface LinearScales {
		x: d3.ScaleLinear<number, number>;
		y: d3.ScaleLinear<number, number>;
	}

	// TODO: Implement re-aquiring of audio file's data on file change
	// useEffect(() => {
	// 	async function setWaveformData(): Promise<void> {
	// 		const audioBuffer = await getAudioBuffer();
	// 		if (audioBuffer) {
	// 			const waveformData = audioBuffer?.getChannelData(0);
	// 			const cleanedData = getCleanData(waveformData);
	// 			setAudioData(cleanedData);
	// 		} else {
	// 			console.error(
	// 				"Could not convert AudioBuffer to channel data.",
	// 			);
	// 		}
	// 	}
	// 	setWaveformData();

	// }, [currentFile]);
	
	// TODO: Implement re-rendering of data on file change
	// useEffect(() => {

	// })

	function getArrayBuffer(): Promise<ArrayBuffer|void> | Error {
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

    async function getAudioBuffer(): Promise<AudioBuffer|undefined|void> {
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
		return data.filter((data) => data as number !== undefined);
	}
    
	async function getAxisScales(): Promise<LinearScales|void> {
		if (!audioData) {
			throw new Error(
				"Could not get audio channel data to create X/Y Scales.",
			);
		}
		const arrayFromTypedArray = [...audioData];
		const minData = d3.min(arrayFromTypedArray) as number;
		const maxData = d3.max(arrayFromTypedArray) as number;
		const xScale = d3
			.scaleLinear()
			.domain([0, audioData.length])
			.range([
				svgMargin.left,
				svgDimensions.width - svgMargin.right,
			]);
		const yScale = d3
			.scaleLinear()
			.domain([minData, maxData])
			.range([
				svgDimensions.height - svgMargin.bottom,
				svgMargin.top,
			]);

		const scales: LinearScales = { x: xScale, y: yScale };
		return scales;
	}

	function getAreaPath(scales: LinearScales): d3.Area<number> {
		const area = d3.area<number>((d, i) => scales.x(i), () => scales.y(0), (d) => scales.y(d)).curve(d3.curveStep);
		return area;
	}

	async function appendAreaPath(): Promise<void> {
		if (!audioData) return;
		const scales = await getAxisScales() as LinearScales;
		const svg = d3.select(svgRef.current);
		const area = getAreaPath(scales);
		svg.append("path")
			.datum(audioData)
			.attr("fill", "#ff980A")
			.attr("d", area(audioData))
	}

	return (
		<div className="waveformDisplay">
			<audio ref={audioRef}></audio>
			{!currentFile ? (
				<button className="defaultAudioBtn" onClick={loadDefaultAudio}>
					Load Default Audio
				</button>
			) : (
				<svg 
					id="waveform" 
					viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} 
					preserveAspectRatio="xMidYMid"
					ref={svgRef}
				>
				</svg>
			)}
		</div>
	);
}