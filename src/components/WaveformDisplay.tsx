import './WaveformDisplay.css';
import { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

export default function WaveformDisplay({ loadDefaultAudio, currentFile, currentSettingInfo, audioContext, audioPaused }) {
	const [audioData, setAudioData] = useState<number[]|null>(null);
	const [displayX, setDisplayX] = useState<number>(0);
 	const audioRef = useRef<HTMLAudioElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const SVG_DIMENSIONS = {
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
			setAudioData(downsampledData as number[]);
		}
		if (currentFile && audioContext) {
			setWaveformData();
		}
	}, [currentFile, audioContext]);

	// Re-render waveform when audio data is edited or a new file is added
	useEffect(() => {
		if (!currentFile || !audioData) return;
		const svg = d3.select(svgRef.current);
		const axisScales = getAxisScales() as LinearScales; 

		async function appendAreaPath(scales: LinearScales): Promise<void> {
			if (!audioData) return;
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

		function renderNewLine(): void {
			svg.append("line")
				.attr("x1", 0)
				.attr("y1", SVG_DIMENSIONS.height)
				.attr("x2", 0)
				.attr("y2", 0)
				.attr("stroke", "blue")
				.attr("stroke-width", "1px");
		}

		appendAreaPath(axisScales);
		renderNewLine();

		return () => {
			svg.selectAll("path").remove();
		}

	}, [audioData, currentFile]);

	useEffect(() => {
		const currentLine = d3.select(svgRef.current).select("line");
		currentLine.attr("x1", displayX);
		currentLine.attr("x2", displayX);
	}, [displayX, audioData])

	function getAxisScales(): LinearScales|undefined {

		if (!audioData && currentFile !== null) {
			console.error("Could not get audio channel data to create X/Y Scales.");
			return undefined
		}
		const arrayFromTypedArray = [...audioData];
		const minData = d3.min(arrayFromTypedArray) as number;
		const maxData = d3.max(arrayFromTypedArray) as number;
		const xScale = d3
			.scaleLinear()
			.domain([0, audioData.length])
			.range([
				0,
				SVG_DIMENSIONS.width,
			]);
		const yScale = d3
			.scaleLinear()
			.domain([minData, maxData])
			.range([
				SVG_DIMENSIONS.height,
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
				console.error("Could not convert audio ArrayBuffer to AudioBuffer.");
			}
			return audioBuffer;
		}
    }

	function getCleanData(data: Float32Array): Float32Array {
		return data.filter((data) => data !== undefined);
	}

	function handleMouseMove(e: React.MouseEvent<SVGSVGElement>): void {
		const screenX = e.nativeEvent.offsetX;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) {
			setDisplayX(e.nativeEvent.offsetX);
			return;
		}
		const viewBoxX = (screenX / rect.width) * SVG_DIMENSIONS.width;
		setDisplayX(viewBoxX);
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
					viewBox={`0 0 ${SVG_DIMENSIONS.width} ${SVG_DIMENSIONS.height}`} 
					preserveAspectRatio="xMidYMid slice"
					ref={svgRef}
					onMouseMove={(e) => handleMouseMove(e)}
				>
				</svg>
			)}
		</div>
	);
}