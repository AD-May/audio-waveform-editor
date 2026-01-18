import type { ChangeEvent } from 'react';
import { useState } from 'react';
import './Tooltip.css';

export default function Tooltip({ setFile }) {
	const [error, setError] = useState<string>("");

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

    return (
		<div className="tooltipContainer">
			<span className="upload-container">
				<label htmlFor="audio-file-select">
					Upload a <b>.mp3</b> file:
				</label>
				<input type="file" id="audio-file-select" name="audio-file" accept="audio/mp3" onChange={onSelectFile} />
				{error && (
					<p className="error"><i>{error}</i></p>
				)}
			</span>
			<span className="editContainer">
				<button id="fade-btn" className="btn btn-light">
					Fade
				</button>
				<button id="trim-btn" className="btn btn-light">
					Trim
				</button>
				<button id="volume-btn" className="btn btn-light">
					Volume
				</button>
			</span>
			<span className="exportContainer">
				<button id="export-btn" className="btn btn-success">
					Export
				</button>
			</span>
		</div>
	);
}