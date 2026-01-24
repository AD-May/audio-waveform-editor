import './WaveformDisplay.css';
import { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

export default function WaveformDisplay({ loadDefaultAudio, currentFile, currentSettingInfo, audioContext }) {
	const [audioData, setAudioData] = useState<number[]|null>(null);
 	const audioRef = useRef<HTMLAudioElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const SVG_MARGIN = {
		height: 500,
		width: 700,
	}


	interface LinearScales {
		x: d3.ScaleLinear<number, number>;
		y: d3.ScaleLinear<number, number>;
	}

	useEffect(() => {
		async function setWaveformData(): Promise<void> {
			const audioBuffer = await getAudioBuffer();
			if (!audioBuffer) {
				console.error("Could not convert AudioBuffer to channel data.");
				return;
			}
			const waveformData = audioBuffer?.getChannelData(0);
			const cleanedData = getCleanData(waveformData);
			const downsampledData: number[] | void = downsample(cleanedData, 2000);
			console.log(downsampledData);
			setAudioData(downsampledData as number[]);
		}
		if (currentFile && audioContext) {
			setWaveformData();
		}
	}, [currentFile]);

	// Re-render waveform when audio data is edited or a new file is added
	useEffect(() => {

		async function appendAreaPath(scales: LinearScales): Promise<void> {
			if (!audioData) return;
			const svg = d3.select(svgRef.current);
			const area = getAreaPath(scales);
			svg.append("path")
				.datum(audioData)
				.attr("fill", "#ff980A")
				.attr("d", area(audioData));
			
		}

		function getAreaPath(scales: LinearScales): d3.Area<number> {
			const area = d3
				.area<number>(
					(d, i) => scales.x(i),
					() => scales.y(0),
					(d) => scales.y(d),
				)
				.curve(d3.curveStep);
			return area;
		}
		appendAreaPath(getAxisScales());

		const svg = svgRef.current;
		return () => {
			d3.select(svg).selectAll("path").remove();
		}

	}, [audioData, currentFile]);


	function getAxisScales(): LinearScales|Error {

		if (!audioData) {
			return new Error(
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
				0,
				SVG_MARGIN.width,
			]);
		const yScale = d3
			.scaleLinear()
			.domain([minData, maxData])
			.range([
				SVG_MARGIN.height,
				0,
			]);

		const scales: LinearScales = { x: xScale, y: yScale };
		return scales;
	}

	function downsample(data: Float32Array, targetLength: number): number[] | void {
		const result: number[] | undefined = [];
		const chunkSize = Math.floor(data.length / targetLength);
		let currentChunk = [];

		for (let i = 0; i <= data.length - chunkSize; i++) {
			if (currentChunk.length > 0 && i % chunkSize === 0) {
				let chunkAverage = d3.mean(currentChunk);
				result.push(chunkAverage);
				currentChunk = [];
			}
			currentChunk.push(data[i]);
		}

		if (typeof result === "undefined") {
			console.error("Audio source could not be downsampled for visualization.");
			return;
		}

		return result;
	}
	

	function getArrayBuffer(): Promise<ArrayBuffer|void> | Error {
		if (currentFile) {
			const reader = new FileReader();
			const resultPromise: Promise<ArrayBuffer|void> = new Promise(
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
		return data.filter((data) => data !== undefined);
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
					viewBox={`0 0 ${SVG_MARGIN.width} ${SVG_MARGIN.height}`} 
					preserveAspectRatio="xMidYMid slice"
					ref={svgRef}
				>
				</svg>
			)}
		</div>
	);
}