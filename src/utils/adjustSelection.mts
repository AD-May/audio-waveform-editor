interface SelectionBounds {
    startIndex: number;
    endIndex: number;
}

interface AudioData {
    type: string,
    data: number[],
}

function adjustSelection(indices: SelectionBounds, audioData: AudioData, adjustmentValue: number) {
    let currentValue;
    let adjustedData = [];
    for (let i = 0; i < audioData.data.length; i++) {
        if (i >= indices.startIndex && i <= indices.endIndex) {
            currentValue = adjustmentValue * audioData.data[i];
        } else {
            currentValue = audioData.data[i];
        }
        adjustedData.push(currentValue);
    }
    return adjustedData;
}

self.onmessage = (e) => {
	const { indices, audioData, adjustmentValue } = e.data;
	const adjustedData = adjustSelection(indices, audioData, adjustmentValue);
	self.postMessage({ type: audioData.type, data: adjustedData });
};