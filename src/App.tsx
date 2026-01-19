import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
  const [settingInfo, setSettingInfo] = useState<object>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  async function loadDefaultAudio(): Promise<void> {
    const DEFAULT_AUDIO_URL: string = "/assets/default-audio[for-p].mp3";
    try {
      const response = await fetch(DEFAULT_AUDIO_URL);
		  const audioBlob = await response.blob();
		  const file = new File([audioBlob], 'default-song.mp3', {
        type:"audio/mpeg"
      });
      setCurrentFile(file);
    } catch (error) {
      console.error("Issue fetching default audio: ", error);
      throw error;
    }
  }

  useEffect(() => {
    if (currentFile) {
      const audioURL = URL.createObjectURL(currentFile);
      setAudioSrc(audioURL);
    
    return () => URL.revokeObjectURL(audioURL);
    } else {
      setAudioSrc(undefined);
    }
  }, [currentFile]);

  return (
    <>
      <header>
        <h1 className="display-1">Audio Waveform Editor</h1>
        <Tooltip setFile={setCurrentFile} audioRef={audioRef} setSettingInfo={setSettingInfo} />
      </header>
      <main>
        <audio ref={audioRef} src={audioSrc}></audio>
        <WaveformDisplay loadDefaultAudio={loadDefaultAudio} currentFile={currentFile} currentSettingInfo={settingInfo} />
      </main>
      <footer>
        Created by <i>Alex M</i>
      </footer>
    </>
  )
}
