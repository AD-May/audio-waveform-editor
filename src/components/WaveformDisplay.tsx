import './WaveformDisplay.css';
import { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

export default function WaveformDisplay({ audioDurationRef, loadDefaultAudio, currentFile, selection, setSelection, nullSelection, svgDimensions, audioData, getAudioTime, currentTime, audioContext, setCurrentTime, seek, playing }) {
	const [displayX, setDisplayX] = useState<number>(0);
	const svgRef = useRef<SVGSVGElement>(null);

	interface LinearScales {
		x: d3.ScaleLinear<number, number>;
		y: d3.ScaleLinear<number, number>;
	}

	// Re-render waveform when audio data is edited or a new file is added
	useEffect(() => {
		// Extract all this logic to a custom useRenderWaveform hook
		if (!currentFile || !audioData || !svgRef.current) return;
		const svg = d3.select(svgRef?.current);
		const g = getGroupSelection();
		const axisScales = getAxisScales() as LinearScales; 

		async function appendAreaPath(scales: LinearScales): Promise<void> {
			if (!audioData) return;
			const area = getAreaPath(scales);
			g.append("path")
				.datum(audioData)
				.attr("id", "waveform-path")
				.attr("fill", "#ff980A")
				.attr("d", area(audioData));
		}

		function getAreaPath(scales: LinearScales): d3.Area<number> {
			const area = d3
				.area<number>(
					(d, i) => scales.x(i),
					() => scales.y(0),
					(d) => scales.y(d),
				);
			return area;
		}

		function renderNewLine(): void {
			g.append("line")
				.attr("x1", 0)
				.attr("y1", svgDimensions.height)
				.attr("x2", 0)
				.attr("y2", 0)
				.attr("stroke", "blue")
				.attr("stroke-width", "1px");
		}

		function createZoom(): void {
			const zoomBehavior = (event) => {
				const k = event.transform.k;
				let x = event.transform.x;
				let y = event.transform.y;

				if (k === 1.0) {
					x = 0;
					y = 0;
				}

				return `translate(${x}, ${y}) scale(${k})`;
			}
			const zoom = d3
				.zoom<SVGSVGElement, unknown>()
				.on("zoom", (event) => g.attr("transform", zoomBehavior(event)))
				.scaleExtent([1, 4])
				.translateExtent([[0, 0], [svgDimensions.width + 100, svgDimensions.height]]);

			svg.call(zoom);
		}

		appendAreaPath(axisScales);
		renderNewLine();
		createZoom();

		return () => {;
			svg.selectAll("*").remove();
		}

	}, [audioData, currentFile]);

	useEffect(() => {
		if (!svgRef.current) return;
		const g = getGroupSelection();
			g.select("line")
				.attr("x1", displayX)
				.attr("x2", displayX);
	}, [displayX]);

	// Update playhead position based on current playback time
	useEffect(() => {
		if (!audioData || !audioDurationRef.current) return;

		const percentPlayed = currentTime / audioDurationRef.current;
		setDisplayX(percentPlayed * svgDimensions.width);
	}, [currentTime, svgDimensions.width]);

	useEffect(() => {
		if (!audioData) return;
		if (!selection) {
			d3.select("#start-line").remove();
			d3.select("#end-line").remove();
			return;
		}
		const [ startX, endX ] = selection;
		const group = getGroupSelection();

		if (startX) {
			const startLine = group.select("#start-line");
			if (startLine.node()) {
				startLine.remove();
			}
			group.append("line")
				.attr("id", "start-line")
				.attr("x1", startX)
				.attr("y1", svgDimensions.height)
				.attr("x2", startX)
				.attr("y2", 0)
				.attr("stroke", "green")
				.attr("stroke-width", "1px");
		}

		if (endX) {
			const endLine = group.select("#end-line");
			if (endLine.node()) {
				endLine.remove();
			}
			group.append("line")
				.attr("id", "end-line")
				.attr("x1", endX)
				.attr("y1", svgDimensions.height)
				.attr("x2", endX)
				.attr("y2", 0)
				.attr("stroke", "red")
				.attr("stroke-width", "1px");
		}
		
	}, [selection])

	function getAxisScales(): LinearScales|undefined {

		if (!audioData && currentFile !== null) {
			console.error("Could not get audio channel data to create X/Y Scales.");
			return undefined
		}
		const arrayFromTypedArray = [...audioData!];
		const minData = d3.min(arrayFromTypedArray) as number;
		const maxData = d3.max(arrayFromTypedArray) as number;
		const xScale = d3
			.scaleLinear()
			.domain([0, audioData!.length])
			.range([
				0,
				svgDimensions.width,
			]);
		const yScale = d3
			.scaleLinear()
			.domain([minData, maxData])
			.range([
				svgDimensions.height,
				0,
			]);

		const scales: LinearScales = { x: xScale, y: yScale };
		return scales;
	}	

	function handleMouseMove(e: React.MouseEvent<SVGSVGElement>): void {
		if (audioContext.state === "running") return;
		const screenX = e.nativeEvent.offsetX;
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect || screenX < 0) {
			setDisplayX(0);
			return;
		}
		const viewBoxX = (screenX / rect.width) * svgDimensions.width;
		setDisplayX(viewBoxX);
	}

	async function handleLeftClick(): Promise<void> {
		if (audioContext.state === "running") {
			return;
		}
        
        const audioTime = await getAudioTime(displayX);
        seek(audioTime);
		setCurrentTime(audioTime);
	}

	function handleRightClick(e): void {
		e.preventDefault();
		const currentX = displayX;
		if (audioContext.state === "running") {
			return;
		}
		if (selection) {
			const [ startX, endX ] = selection;
			const THRESHOLD = 10; // Amount of space around click in px that allows for selection
            // If right click on selection line, selection will be reset
			if ((currentX >= startX! - THRESHOLD) && (currentX <= startX! + THRESHOLD) 
				|| (currentX >= endX! - THRESHOLD) && (currentX <= endX! + THRESHOLD)) {
				setSelection(null);
            // Move start of selection if right click further left than it
			} else if (currentX < startX!) {
				setSelection([currentX, endX]);
			} else {
                // Move/add end selection if right click further right than start of selection
				setSelection([startX, currentX]);
			}
		} else {
			setSelection([currentX, null]);
		}
	}

	function getFormattedTimestamp(seekTimestamp: number): string {
		const minutes = Math.floor(seekTimestamp / 60);
		let seconds = Math.round(seekTimestamp % 60);
		if (seconds === 60) {
			seconds = 59;
		}
		const formattedTime = `${minutes}:${seconds < 10 ? (`0${seconds}`) : seconds}`;
		return formattedTime;
	}

	function getGroupSelection(): d3.Selection<SVGGElement, unknown, null, undefined> {
		const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
		let group = svg.select<SVGGElement>("g");
		
		if (group.empty()) {
			group = svg.append<SVGGElement>("g");
		}
		return group;
	}

	function checkLoaded(): boolean {
		const path = d3.select(svgRef.current).select("#waveform-path").node();
		return path !== null;
	}

	return (
		<div className="waveformDisplay">
			{!currentFile ? (
				<button className="defaultAudioBtn" onClick={loadDefaultAudio}>
					Load Default Audio
				</button>
			) : (
				<>
					{checkLoaded() && (
						<div className="display">
							{audioContext.state === "suspended" && (
								<span className="seekDisplay display">
									{playing === false && (
										<h2>
											Seek:{" "}
											{getFormattedTimestamp(
												getAudioTime(displayX),
											)}
										</h2>
									)}
								</span>
							)}
							{playing && (
								<span className="timestampDisplay display">
									<h2>
										{getFormattedTimestamp(currentTime)}
									</h2>
								</span>
							)}
							{!nullSelection() && (
								<span className="segmentDisplay display">
									<h3>
										Selection:
										<span className="startTime">
											{` ${getFormattedTimestamp(getAudioTime(selection[0]!))} `}
										</span>
										-
										<span className="endTime">
											{` ${getFormattedTimestamp(getAudioTime(selection[1]!))}`}
										</span>
									</h3>
								</span>
							)}
						</div>
					)}
					<svg
						id="waveform"
						viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
						preserveAspectRatio="xMidYMid slice"
						ref={svgRef}
						onMouseMove={(e) => handleMouseMove(e)}
						onClick={handleLeftClick}
						onContextMenu={(e) => handleRightClick(e)}
					></svg>
				</>
			)}
		</div>
	);
}