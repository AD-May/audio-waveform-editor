import { useState, useEffect, useRef, type Ref, type RefObject } from 'react';

interface Node {
    name: string;
    node: AudioNode;
}

interface NodeCreationInfo {
    selectedNode: Node;
    newAudioNodes: Node[];
}

export function usePlayback(audioData: Float32Array | null, audioContext: AudioContext | undefined, selection: number[] | null, modifySelectionData: (value?: number) => void
, audioDurationRef: RefObject<number>) {
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
    const [playing, setPlaying] = useState<boolean>(false);
    const [audioNodes, setAudioNodes] = useState<Node[]>([]);
    const [intervalId, setIntervalId] = useState<number | null>(null);

    useEffect(() => {
		function connectAudioNodes(): void {
			if (audioNodes.length === 1) {
				audioNodes[0].node.connect(
					audioContext?.destination as AudioNode,
				);
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
				audioNode.node.disconnect();
			}
		}

		return () => disconnectAudioNodes();
	}, [audioNodes, audioContext?.destination]);

	useEffect(() => {
		if (!audioData) return;
		let sourceNode: AudioBufferSourceNode | undefined;
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
				setCurrentPlaybackTime((t) =>
					t >= audioDurationRef!.current ? 0 : t + 1,
				);
			}, 1000);
            setIntervalId(intervalId);
		}

		return () => clearInterval(intervalId);

	}, [playing]);

    useEffect(() => {
        setCurrentPlaybackTime(0);
    }, [audioContext]);

    useEffect(() => {
        if (currentPlaybackTime >= audioDurationRef.current && intervalId) {
            clearInterval(intervalId);
            setCurrentPlaybackTime(0);
        }
    }, [currentPlaybackTime])

    async function createNewSourceNode(
		time: number,
	): Promise<AudioBufferSourceNode> {
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

	function seek(time: number): void {
		const oldSourceNode = getAudioNode<AudioBufferSourceNode>("source");
		if (!oldSourceNode) return;
		oldSourceNode.stop();
		createNewSourceNode(time);
	}

	function setEditTimes(param: AudioParam, value: number): void {
		if (!selection[0] || !selection[1]) {
			return;
		}
		if (selection[0] && (selection![0] - currentPlaybackTime < 0)) {
			return;
		}
		const startTime =
			audioContext!.currentTime + (selection![0] - currentPlaybackTime);
		const endTime =
			audioContext!.currentTime + (selection![1] - currentPlaybackTime);
		param.setValueAtTime(value, startTime);
		param.setValueAtTime(value, endTime);
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

    return {
        currentPlaybackTime,
        setCurrentPlaybackTime,
        playing,
        setPlaying,
        seek,
        panAudio,
        changeVolume,
    }
}