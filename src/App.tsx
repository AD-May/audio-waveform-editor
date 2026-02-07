import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, useEffect, type ChangeEvent } from 'react';

export default function App() {
   
  interface Node {
    name: string,
    node: AudioNode,
  }

  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
  const [audioContext , setAudioContext] = useState<AudioContext|null>(null);
  const [selection, setSelection] = useState<Array<number | null> | null>(null);
  const [audioNodes, setAudioNodes] = useState<Node[]>([]);
  const [currentSetting, setCurrentSetting] = useState<string>("")
  const audioRef = useRef<HTMLAudioElement>(null);
  const isAudioConnected = useRef(false);

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

  function handleSlider(e: ChangeEvent): void {
        const target = e.target as HTMLInputElement;
        const currentValue = Number(target.value);
        console.log("currentSetting in handleSlider:", currentSetting);
        console.log("entering switch");
		switch (currentSetting) {
			case "balance":
                console.log("inside balance case");
                target.max = "1";
                target.min = "-1";
                target.step = ".25";
		        panAudio(currentValue);
                break;
		}
  }

  function panAudio(value: number) {
    let newAudioNodes: Node[] = audioNodes;
    let selectedNode;
    const existingNode: Node|undefined = audioNodes?.find((nodeObj) => nodeObj.name === "balance");
    if (!existingNode) {
        selectedNode = {
            name: "balance",
            node: new StereoPannerNode(audioContext!),
        }
        newAudioNodes = [
			...audioNodes,
			selectedNode,
	    ];
    } else {
         selectedNode = existingNode;
    }
    const pannerNode = selectedNode!.node as StereoPannerNode
    pannerNode.pan.value = value;
    setAudioNodes(newAudioNodes);
  }

  return (
    <>
      <header>
        <h1 className="display-1">Audio Waveform Editor</h1>
        <Tooltip 
          setFile={setCurrentFile} 
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
          currentFile={currentFile} 
          audioContext={audioContext}
          audioRef={audioRef}
          selection={selection}
          setSelection={setSelection}
          hasNullish={hasNullish}
          audioNodes={audioNodes}
        />
      </main>
      <footer>
        Created by <i>Alex M</i>
      </footer>
    </>
  )
}
