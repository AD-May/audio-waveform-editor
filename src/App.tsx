import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, useEffect, type ChangeEvent } from 'react';

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
    const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
    const [audioData, setAudioData] = useState<number[] | null>(null);
    const [audioContext , setAudioContext] = useState<AudioContext|null>(null);
    const [selection, setSelection] = useState<Array<number | null> | null>(null);
    const [audioNodes, setAudioNodes] = useState<Node[]>([]);
    const [currentSetting, setCurrentSetting] = useState<string>("")
    const audioRef = useRef<HTMLAudioElement>(null);
    const baseDataRef = useRef<number[] | null>(null);
    const isAudioConnected = useRef(false);

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
        getWaveformData();
    }, [currentFile, audioContext]);

    useEffect(() => {
        downsampleWorker.onmessage = (e) => {
            baseDataRef.current = e.data;
            setAudioData(e.data);
        };

        selectionWorker.onmessage = (e) => {
            setAudioData(e.data);
        };

    }, []);

    useEffect(() => {
        let audioURL: string;
        if (currentFile && audioRef.current) {
        audioURL = URL.createObjectURL(currentFile);
            setAudioSrc(audioURL);
        } else {
            setAudioSrc(undefined);
        }

        return () => {
            URL.revokeObjectURL(audioURL);
        }

    }, [currentFile, audioContext]);

    useEffect(() => {
        if (isAudioConnected.current) return;
        
        const newAudioContext = new AudioContext();
        const source = new MediaElementAudioSourceNode(newAudioContext, {
            mediaElement: audioRef.current!,
        });

        setAudioContext(newAudioContext);
        setAudioNodes([{
            name: "source",
            node: source,
        }]);
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

    function hasNullish(): boolean {
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

	async function getAudioBuffer(): Promise<AudioBuffer | undefined | void> {
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
        gainNode.gain.setValueAtTime(value, getCursorAudioTime(selection![0] as number));
        gainNode.gain.setValueAtTime(1.0, getCursorAudioTime(selection![1] as number));
        modifySelection(value);
        setAudioNodes(newAudioNodes);
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

    function modifySelection(adjustmentValue: number) {
        if (!selection) return;
        const startIndex = Math.round(selection[0] / SVG_DIMENSIONS.width * audioData!.length);
        const endIndex = Math.round(selection[1] / SVG_DIMENSIONS.width * audioData!.length);
        selectionWorker.postMessage({
			indices: { startIndex, endIndex },
            baseAudioData: baseDataRef.current,
            adjustmentValue,
		});
    }

    function getCursorAudioTime(cursorX: number): number {
        const percentSeeked = cursorX / SVG_DIMENSIONS.width;
        return audioRef.current?.duration * percentSeeked;
    }

    return (
        <>
        <header>
            <h1 className="display-1">Audio Waveform Editor</h1>
            <Tooltip 
                setFile={setCurrentFile} // Extract this file logic out to custom hook (useSetFile)
                audioContext={audioContext} 
                audioRef={audioRef} 
                setCurrentSetting={setCurrentSetting} 
                handleSlider={handleSlider}
                invalidSelection={hasNullish}
            />
        </header>
        <main>
            <audio ref={audioRef} src={audioSrc}></audio>
            <WaveformDisplay 
                loadDefaultAudio={loadDefaultAudio} 
                currentFile={currentFile} // Extract to the custom hook useSetFile
                audioData={audioData}
                audioRef={audioRef}
                selection={selection}
                setSelection={setSelection}
                hasNullish={hasNullish}
                svgDimensions={SVG_DIMENSIONS}
                getAudioTime={getCursorAudioTime}
            />
        </main>
        <footer>
            Created by <i>Alex M</i>
        </footer>
        </>
    )
}
