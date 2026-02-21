import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import type { SelectionBounds } from './types/types.mts';
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
    const [visualData, setVisualData] = useState<Float32Array | null>(null);
    const [audioContext , setAudioContext] = useState<AudioContext | null>(null);
    const [selection, setSelection] = useState<Array<number | null> | null>(null);
    const [audioNodes, setAudioNodes] = useState<Node[]>([]);
    const [currentSetting, setCurrentSetting] = useState<string>("")
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
    const [playing, setPlaying] = useState<boolean>(false);
    const isAudioConnected = useRef<boolean>(false);
    const audioDurationRef = useRef<number | null>(null);

    interface Edit {
        startX: number;
        endX: number;
    }

    interface Node {
        name: string;
        node: AudioNode;
        edits?: Edit[] | null;
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
        // Stop AudioContext from playing immediately
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
            sourceNode = await createNewSourceNode(currentPlaybackTime);
        })();
        if (typeof sourceNode === "undefined") return;

        return () => sourceNode?.stop();
        
    }, [audioData]);

    useEffect(() => {
        if (!audioContext) return;
        let intervalId: number;
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

    function panAudio(value: number) {
        const { selectedNode, newAudioNodes } = createNode({ 
            name: "Balance", 
            node: new StereoPannerNode(audioContext!),
        });
        const pannerNode = selectedNode!.node as StereoPannerNode;
        pannerNode.pan.value = value;
        setAudioNodes(newAudioNodes);
    }

    function changeVolume(value: number) {
        const { selectedNode, newAudioNodes } = createNode({
			name: "Gain",
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
            // if source node, set edits to null
            edits: null,
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
                edits: [
                    { 
                        startX: selection![0] as number, 
                        endX: selection![1] as number,
                    }
                ],
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

    function getBufferIndices(data: Float32Array): SelectionBounds | void {
        if (checkNullSelection()) return;
        const startIndex = Math.round((selection![0]! / SVG_DIMENSIONS.width) * data.length);
        const endIndex = Math.round((selection![1]! / SVG_DIMENSIONS.width) * data.length);
        return { startIndex, endIndex };
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

    function modifySelectionData(adjustmentValue?: number) {
        if (!selection) return;
        const audioIndices = getBufferIndices(audioData!);
        const visualIndices = getBufferIndices(visualData!);

        selectionWorker.postMessage({
			indices: { startIndex: audioIndices?.startIndex, endIndex: audioIndices?.endIndex },
            audioData: { type: "audio", data: audioData },
            adjustmentValue: adjustmentValue ?? undefined,
		});
        selectionWorker.postMessage({
            indices: { startIndex: visualIndices?.startIndex, endIndex: visualIndices?.endIndex },
            audioData: { type: "visual", data: visualData},
            adjustmentValue: adjustmentValue ?? undefined,
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
