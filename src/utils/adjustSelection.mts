interface SelectionBounds {
    startIndex: number;
    endIndex: number;
}

function adjustSelection(indices: SelectionBounds, baseAudioData: number[], adjustmentValue: number) {
    let currentValue;
    let adjustedData = [];
    for (let i = 0; i < baseAudioData.length; i++) {
        if (i >= indices.startIndex && i <= indices.endIndex) {
            currentValue = adjustmentValue * baseAudioData[i];
        } else {
            currentValue = baseAudioData[i];
        }
        adjustedData.push(currentValue);
    }
    return adjustedData;
}

self.onmessage = (e) => {
	const { indices, baseAudioData, adjustmentValue } = e.data;
	const adjustedData = adjustSelection(indices, baseAudioData, adjustmentValue);
	self.postMessage(adjustedData);
};