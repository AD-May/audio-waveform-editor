import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
  const [settingInfo, setSettingInfo] = useState<object>({});
  const [audioContext , setAudioContext] = useState<AudioContext|null>(null);
  const [selection, setSelection] = useState<Array<number | null> | null>(null);
  //const [audioNodes, setAudioNodes]
  const audioRef = useRef<HTMLAudioElement>(null);
  const isAudioConnected = useRef(false);

  async function loadDefaultAudio(): Promise<void> {
    const DEFAULT_AUDIO_URL = "/assets/default-audio[for-p].mp3";
    try {
      const response = await fetch(DEFAULT_AUDIO_URL);
		  const audioBlob = await response.blob();
		  const file = new File([audioBlob], 'default-song.mp3', {
        type:"audio/mpeg"
      });
      setCurrentFile(file);
    } catch (error) {
      console.error("Issue fetching default audio: ", error);
    }
  }

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
    source.connect(newAudioContext.destination);
    setAudioContext(newAudioContext);
    isAudioConnected.current = true;

  }, []);

  return (
    <>
      <header>
        <h1 className="display-1">Audio Waveform Editor</h1>
        <Tooltip setFile={setCurrentFile} audioContext={audioContext} setSettingInfo={setSettingInfo} audioRef={audioRef} />
      </header>
      <main>
        <audio ref={audioRef} src={audioSrc}></audio>
        <WaveformDisplay 
          loadDefaultAudio={loadDefaultAudio} 
          currentFile={currentFile} 
          currentSettingInfo={settingInfo} 
          audioContext={audioContext}
          audioRef={audioRef}
          selection={selection}
          setSelection={setSelection}
        />
      </main>
      <footer>
        Created by <i>Alex M</i>
      </footer>
    </>
  )
}
