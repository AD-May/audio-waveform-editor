import './WaveformDisplay.css';
import { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

// TODO: Make sure URL path is corrected when we move .mjs file from build into dist dir
const downsampleWorker = new Worker(
	new URL("../utils/downsample.mjs", import.meta.url),
	{ type: 'module' }
);

const NUMBER_OF_SAMPLES = 2000;

export default function WaveformDisplay({ loadDefaultAudio, currentFile, currentSettingInfo, audioContext, audioRef }) {
	const [audioData, setAudioData] = useState<number[]|null>(null);
	const [displayX, setDisplayX] = useState<number>(0);
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

		async function getWaveformData(): Promise<void> {
			const audioBuffer = await getAudioBuffer();
			if (!audioBuffer) {
				console.error("Could not convert AudioBuffer to channel data.");
				return;
			}
			const waveformData = audioBuffer?.getChannelData(0);
			const cleanedData = getCleanData(waveformData);
			downsampleWorker.postMessage({
				data: cleanedData,
				targetLength: NUMBER_OF_SAMPLES,
			});
		}
		if (currentFile && audioContext) {
			getWaveformData();
		}
	}, [currentFile, audioContext]);

	useEffect(() => {
		downsampleWorker.onmessage = (e) => {
			setAudioData(e.data);
		};
	}, []);

	// Re-render waveform when audio data is edited or a new file is added
	useEffect(() => {
		// Extract all this logic to a custom useRenderWaveform hook
		if (!currentFile || !audioData) return;
		const svg = getSvgSelection();
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

		function createZoom() {
			const transformBehavior = (event) => {
				const panSpeed = 2.0;

				const t = event.transform;
				const x = t.x * panSpeed;
				const y = t.y * panSpeed;

				return `translate(${x}, ${y}) scale(${t.k})`;
			}
			const svg = getSvgSelection();
			const zoom = d3
				.zoom<SVGSVGElement, unknown>()
				.on("zoom", (event) => svg.attr("transform", transformBehavior(event)))
				.scaleExtent([1, 2])
				.translateExtent([[0, 0], [SVG_DIMENSIONS.width, SVG_DIMENSIONS.height]]);

			svg.call(zoom);
		}

		appendAreaPath(axisScales);
		renderNewLine();
		createZoom();

		return () => {;
			svg.selectAll("*").remove();
		}

	}, [audioData, currentFile]);

	// Update line position when displayX changes
	useEffect(() => {
		const svg = getSvgSelection();
			svg.select("line")
				.attr("x1", displayX)
				.attr("x2", displayX);
	}, [displayX]);

	// Animate playhead during playback using requestAnimationFrame
	useEffect(() => {
		if (!audioRef.current) return;

		let animationId: number;

		function updatePlayhead() {
			if (!audioRef.current || audioRef.current.paused) return;

			const percentPlayed = audioRef.current.currentTime / audioRef.current.duration;
			setDisplayX(percentPlayed * SVG_DIMENSIONS.width);

			// Keep the loop going
			animationId = requestAnimationFrame(updatePlayhead);
		}

		function handlePlay() {
			animationId = requestAnimationFrame(updatePlayhead);
		}

		function handlePause() {
			cancelAnimationFrame(animationId);
		}

		function handleEnded() {
			cancelAnimationFrame(animationId);
			setDisplayX(0);
		}

		const audio = audioRef.current;
		audio.addEventListener('play', handlePlay);
		audio.addEventListener('pause', handlePause);
		audio.addEventListener('ended', handleEnded);

		return () => {
			cancelAnimationFrame(animationId);
			audio.removeEventListener('play', handlePlay);
			audio.removeEventListener('pause', handlePause);
			audio.removeEventListener('ended', handleEnded);
		};
	}, [audioRef, SVG_DIMENSIONS.width])

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
		if (!audioRef.current.paused) return;
		const screenX = e.nativeEvent.offsetX;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) {
			setDisplayX(e.nativeEvent.offsetX);
			return;
		}
		const viewBoxX = (screenX / rect.width) * SVG_DIMENSIONS.width;
		setDisplayX(viewBoxX);
	}

	function getCursorAudioTime(): number|void {
		if (!svgRef.current) return;
		const percentSeeked = displayX / SVG_DIMENSIONS.width;
		return audioRef.current?.duration * percentSeeked;
	}

	function getSvgSelection() {
		return d3.select<SVGSVGElement, unknown>(svgRef.current!);
	}


	return (
		<div className="waveformDisplay">
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