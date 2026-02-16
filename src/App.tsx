import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, useEffect, type ChangeEvent } from 'react';
// TODO Move related state to reducer or custom hooks, add try/catch error handling, and add unit/integration tests

// TODO: Make sure URL path is corrected when we move .mjs file from build into dist dir
const downsampleWorker = new Worker(
	new URL("./utils/downsample.mjs", import.meta.url),
	{ type: 'module' }
);

const selectionWorker = new Worker(
    new URL("./utils/adjustSelection.mjs", import.meta.url),
    { type: 'module' }
);

const SVG_DIMENSIONS = {
    height: 500,
    width: 700,
}

const NUMBER_OF_SAMPLES = 4000;

export default function App() {
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [audioData, setAudioData] = useState<Float32Array | null>(null);
    const [visualData, setVisualData] = useState<number[] | null>(null);
    const [audioContext , setAudioContext] = useState<AudioContext | null>(null);
    const [selection, setSelection] = useState<Array<number | null> | null>(null);
    const [audioNodes, setAudioNodes] = useState<Node[]>([]);
    const [currentSetting, setCurrentSetting] = useState<string>("")
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
    const [playing, setPlaying] = useState<boolean>(false);
    const baseDataRef = useRef<number[] | null>(null);
    const isAudioConnected = useRef<boolean>(false);
    const audioDurationRef = useRef<number | null>(null);

    interface Node {
        name: string;
        node: AudioNode;
    }

    interface NodeCreationInfo {
        selectedNode: Node;
        newAudioNodes: Node[];
    }

    useEffect(() => {
        if (!currentFile || !audioContext) return;

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
        setCurrentPlaybackTime(0);
    }, [currentFile, audioContext]);

    useEffect(() => {
        downsampleWorker.onmessage = (e) => {
            baseDataRef.current = e.data;
            setVisualData(e.data);
        };

        selectionWorker.onmessage = (e) => {
            if (e.data.type === "visual") {
                setVisualData(e.data.data);
            } else if (e.data.type === "audio") {
                const audioArray = new Float32Array(e.data.data);
                setAudioData(audioArray);
            }
        };

        if (isAudioConnected.current) return;

		const newAudioContext = new AudioContext();
        newAudioContext.suspend();

		setAudioContext(newAudioContext);
		isAudioConnected.current = true;

    }, []);

    useEffect(() => {
        function connectAudioNodes(): void {
            if (audioNodes.length === 1) {
                audioNodes[0].node.connect(audioContext?.destination as AudioNode);
                return;
            }
            for (let i = 0; i < audioNodes.length; i++) {
                const currentNode = audioNodes[i].node;
                if (i + 1 === audioNodes.length) {
                    currentNode.connect(audioContext?.destination as AudioNode);
                    break;
                }
                const nextNode = audioNodes[i + 1].node;
                currentNode.connect(nextNode);
            }
        }

        connectAudioNodes();

        function disconnectAudioNodes(): void {
            for (const audioNode of audioNodes) {
                audioNode.node.disconnect()
            }
        }

        return () => disconnectAudioNodes();

    }, [audioNodes, audioContext?.destination]);

    useEffect(() => {
        if (!audioData) return; 
        let sourceNode: AudioBufferSourceNode|undefined;
        (async () => {
            sourceNode = await createNewSourceNode();
        })();
        if (typeof sourceNode === "undefined") return;

        return () => sourceNode?.stop();
        
    }, [audioData]);

    useEffect(() => {
        if (!audioContext) return;
        let intervalId;
        if (playing) {
            intervalId = setInterval(() => {
                setCurrentPlaybackTime((t) => t >= audioDurationRef.current ? 0 : t + 1)
            }, 1000);
        }

        return () => clearInterval(intervalId);
    }, [playing]);

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

	async function convertToAudioBuffer(
		arr: Float32Array,
		sampleRate: number = 48000,
	): Promise<AudioBuffer> {
		const numChannels = 2;
		const length = arr.length;
		const audioBuffer = audioContext!.createBuffer(
			numChannels,
			length,
			sampleRate,
		);

		audioBuffer.getChannelData(0).set(arr);
		audioBuffer.getChannelData(1).set(arr);

		return audioBuffer;
	}

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

    function handleSlider(e: ChangeEvent): void {
            const target = e.target as HTMLInputElement;
            const currentValue = Number(target.value);
            switch (currentSetting) {
                case "balance":
                    target.max = "1";
                    target.min = "-1";
                    target.step = ".25";
                    panAudio(currentValue);
                    break;
                case "gain":
                    target.max = "2";
                    target.min = "0";
                    target.step = ".20";
                    changeVolume(currentValue);
                    break;
            }
    }

    function panAudio(value: number) {
        const { selectedNode, newAudioNodes } = createNode({ 
            name: "balance", 
            node: new StereoPannerNode(audioContext!),
        });
        const pannerNode = selectedNode!.node as StereoPannerNode;
        pannerNode.pan.value = value;
        setAudioNodes(newAudioNodes);
    }

    function changeVolume(value: number) {
        const { selectedNode, newAudioNodes } = createNode({
            name: "gain",
            node: new GainNode(audioContext!),
        });
        const gainNode = selectedNode!.node as GainNode;
        gainNode.gain.value = value;
        setEditTimes(gainNode.gain, value);
        modifySelectionData(value);
        setAudioNodes(newAudioNodes);
    }

    async function createNewSourceNode(time: number): Promise<AudioBufferSourceNode> {
        const audioBuffer = await convertToAudioBuffer(audioData!);

        const sourceNode = new AudioBufferSourceNode(audioContext!, {
            buffer: audioBuffer,
        });

        sourceNode.start(0, time);

        const newNode = {
            name: "source",
            node: sourceNode,
        };

        if (audioNodes.length === 0) {
            setAudioNodes([newNode]);
        } else {
            const newAudioNodes = audioNodes.map((node) => {
                if (node.name === "source") {
                    return newNode;
                } else {
                    return node;
                }
            });
            setAudioNodes(newAudioNodes);
        }
        return sourceNode;
    }

    function createNode(currentNode: Node): NodeCreationInfo {
        let newAudioNodes: Node[] = audioNodes;
        let selectedNode;
        const existingNode: Node | undefined = audioNodes?.find(
            (nodeObj) => nodeObj.name === currentNode.name,
        );
        if (!existingNode) {
            selectedNode = {
                name: currentNode.name,
                node: currentNode.node,
            };
            newAudioNodes = [...audioNodes, selectedNode];
        } else {
            selectedNode = existingNode;
        }
        return { selectedNode, newAudioNodes };
    }

    function getAudioNode<T extends AudioNode>(name: string): T | undefined {
        const node = audioNodes.find((node) => node.name === name);
        if (!node) {
            return undefined;
        }
        return node.node as T;
    }

    function seek(time: number): void {
        const oldSourceNode = getAudioNode<AudioBufferSourceNode>("source");
        if (!oldSourceNode) return;
        oldSourceNode.stop();
        createNewSourceNode(time);
    }

    function setEditTimes(param: AudioParam, value: number): void {
        if (checkNullSelection()) {
            return;
        }
        if (selection![0] - currentPlaybackTime < 0) {
            return;
        }
        const startTime = audioContext!.currentTime + (selection![0] - currentPlaybackTime);
        const endTime = audioContext!.currentTime + (selection![1] - currentPlaybackTime);
        param.setValueAtTime(value, startTime);
        param.setValueAtTime(value, endTime);
    }

    // TODO: Refactor using splice/join with indices (more performant)
    function modifySelectionData(adjustmentValue: number) {
        if (!selection) return;
        const startIndexData = Math.round(selection[0] / SVG_DIMENSIONS.width * audioData!.length);
        const endIndexData = Math.round(selection[1] / SVG_DIMENSIONS.width * audioData!.length);
        const startIndexVisual = Math.round(selection[0] / SVG_DIMENSIONS.width * visualData!.length);
        const endIndexVisual = Math.round(selection[1] / SVG_DIMENSIONS.width * visualData!.length);

        selectionWorker.postMessage({
			indices: { startIndex: startIndexData, endIndex: endIndexData },
            audioData: { type: "audio", data: audioData },
            adjustmentValue,
		});
        selectionWorker.postMessage({
            indices: { startIndex: startIndexVisual, endIndex: endIndexVisual },
            audioData: { type: "visual", data: baseDataRef.current },
            adjustmentValue,
        });
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
                setCurrentSetting={setCurrentSetting} 
                handleSlider={handleSlider}
                invalidSelection={checkNullSelection}
                setPlaying={setPlaying}
            />
        </header>
        <main>
            <WaveformDisplay 
                loadDefaultAudio={loadDefaultAudio} 
                currentFile={currentFile} // Extract to the custom hook useSetFile
                audioData={visualData}
                selection={selection}
                setSelection={setSelection}
                nullSelection={checkNullSelection}
                svgDimensions={SVG_DIMENSIONS}
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
