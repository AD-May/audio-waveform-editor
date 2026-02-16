function adjustSelection(indices, audioData, adjustmentValue) {
    var currentValue;
    var adjustedData = [];
    for (var i = 0; i < audioData.data.length; i++) {
        if (i >= indices.startIndex && i <= indices.endIndex) {
            currentValue = adjustmentValue * audioData.data[i];
        }
        else {
            currentValue = audioData.data[i];
        }
        adjustedData.push(currentValue);
    }
    return adjustedData;
}
self.onmessage = function (e) {
    var _a = e.data, indices = _a.indices, audioData = _a.audioData, adjustmentValue = _a.adjustmentValue;
    var adjustedData = adjustSelection(indices, audioData, adjustmentValue);
    self.postMessage({ type: audioData.type, data: adjustedData });
};
export {};
