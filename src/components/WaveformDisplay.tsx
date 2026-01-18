import './WaveformDisplay.css';
import { useState } from 'react';

export default function WaveformDisplay({ loadDefaultAudio, currentFile }) {


    function getArrayBuffer():Promise<ArrayBuffer | void> {
        const reader = new FileReader();
        const resultPromise: Promise<ArrayBuffer | void> = new Promise((resolve, reject) => {
            reader.readAsArrayBuffer(currentFile);
            reader.addEventListener("loadend", () => {
                if (!reader.result) {
                    reject(new Error("FileReader could not convert file data to an ArrayBuffer"));
                }
				resolve(reader.result as ArrayBuffer)
            });
        });
        return resultPromise;
    }

    
    
    return (
        <div className="waveformDisplay">
            {!currentFile && <button className="defaultAudioBtn" onClick={loadDefaultAudio}>Load Default Audio</button>}
        </div>
    )
}