import './App.css';
import Tooltip from './components/Tooltip.tsx';
import WaveformDisplay from './components/WaveformDisplay.tsx';
import { useState } from 'react';

export default function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  async function loadDefaultAudio(): Promise<void> {
    const DEFAULT_AUDIO_URL: string = "./assets/default-audio[for-p].mp3";
    try {
      const response = await fetch(DEFAULT_AUDIO_URL);
		  const audioBlob = await response.blob();
		  const file = new File([audioBlob], 'default-song.mp3');
      setCurrentFile(file);
    } catch (error) {
      console.log("Issue fetching default audio: ", error);
      throw error;
    }
  }

  return (
    <>
      <header>
        <h1 className="display-1">Audio Waveform Editor</h1>
        <Tooltip setFile={setCurrentFile}/>
      </header>
      <main>
        <WaveformDisplay loadDefaultAudio={loadDefaultAudio} currentFile={currentFile} setFile={setCurrentFile} />
      </main>
      <footer>
        Created by <i>Alex M</i>
      </footer>
    </>
  )
}
