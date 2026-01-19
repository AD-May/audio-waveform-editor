import type { ChangeEvent } from 'react';
import { useState } from 'react';
import './Tooltip.css';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function Tooltip({ setFile, audioRef, setSettingInfo }) {
	const [error, setError] = useState<string>("");
	const [displaySlider, setDisplaySlider] = useState<boolean>(false);
	const [currentSetting, setCurrentSetting] = useState<string>("");

	//TODO: Find some way to add the name of the edit and the current slidervalue to the setSliderInfo prop

	function onSelectFile(event: ChangeEvent): void {
		const files = (event.target as HTMLInputElement).files
		if (files) {
			if (files.length > 1) {
				setError("Please upload only one file.");
				return;
			}
			if (files[0].size > 10_485_760) {
				setError("Please upload a file less than 10MB.");
				return;
			}
			setError("");
			setFile(files[0]);
		}	
	}

	function handleAudioPlayback(): void {
		if (!audioRef.current.paused) {
			audioRef.current.pause();
		} else {
			audioRef.current.play();
		}
	}

	function handleDisplaySlider(): void {
		if (displaySlider) {
			setDisplaySlider(false);
		} else {
			setDisplaySlider(true);
		}
	}
	

    return (
		<div className="tooltipContainer">
			<span className="upload-container">
				<label
					id="audio-upload-label"
					htmlFor="audio-file-select"
					aria-label="file upload button"
				>
					Upload a <b>.mp3</b> file:
				</label>
				<input
					type="file"
					id="audio-file-select"
					name="audio-file"
					accept="audio/mp3"
					onChange={onSelectFile}
					aria-labelledby="audio-upload-label"
				/>
				{error && (
					<p className="error">
						<i>{error}</i>
					</p>
				)}
			</span>
			<span className="editContainer">
				<button
					id="balance-btn"
					className="btn btn-light"
					aria-label="balance button"
					onClick={() => {
						handleDisplaySlider();
						setCurrentSetting("balance");
					}}
				>
					Balance
				</button>
				<button
					id="trim-btn"
					className="btn btn-light"
					aria-label="trim button"
				>
					Trim
				</button>
				<button
					id="volume-btn"
					className="btn btn-light"
					aria-label="volume button"
					onClick={() => {
						handleDisplaySlider();
						setCurrentSetting("volume");
					}}
				>
					Volume
				</button>
			</span>
			{displaySlider && (
				<input
					type="range"
					className="slider"
					min="0"
					max="100"
					onChange={(e) => setSettingInfo({ currentSetting, value: e.target.value})}
				/>
			)}
			<span className="controls">
				<button
					id="play-btn"
					className="btn btn-light"
					onClick={handleAudioPlayback}
					title="Play/Pause"
					aria-label="play button"
				>
					<FontAwesomeIcon icon={faPlay} />/
					<FontAwesomeIcon icon={faPause} />
				</button>
			</span>
			<span className="exportContainer">
				<button
					id="export-btn"
					className="btn btn-success"
					aria-label="export button"
				>
					Export
				</button>
			</span>
		</div>
	);
}