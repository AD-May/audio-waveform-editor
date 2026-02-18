import type { SelectionBounds } from "../types/types.mts";

export interface AudioData {
	type: string;
	data: number[];
}

export function adjustSelection(indices: SelectionBounds, audioData: AudioData, adjustmentValue?: number): number[] {
    try {
        if (audioData.type !== "visual" && audioData.type !== "audio") {
            throw new Error("audioData.type cannot be a string other than 'visual' or 'audio'.");
        }
        if (audioData.data.length === 0) {
            throw new Error("audioData.data cannot be an empty array");
        }
        if (adjustmentValue && ((adjustmentValue > 100) || (adjustmentValue < -100))) {
            throw new Error("adjustmentValue cannot be outside the ranges of -100 to 100");
        }
        let currentValue;
		let adjustedData = [];
		for (let i = 0; i < audioData.data.length; i++) {
			currentValue = audioData.data[i];
			if (i >= indices.startIndex && i <= indices.endIndex) {
				// if no adjustment value argument provided, skip adding to adjustedData for the current iteration
				if (!adjustmentValue) {
					adjustmentValue = 0;
				}
				currentValue = adjustmentValue * audioData.data[i];
			}
			adjustedData.push(currentValue);
		}
		return adjustedData;
    } catch (err) {
        console.error("Could not adjust the selected section of audio: ", err);
        throw err;
    }
}

if (typeof self !== "undefined") {
    self.onmessage = (e) => {
		const { indices, audioData, adjustmentValue } = e.data;
		const adjustedData = adjustSelection(
			indices,
			audioData,
			adjustmentValue,
		);
		self.postMessage({ type: audioData.type, data: adjustedData });
	};
}
