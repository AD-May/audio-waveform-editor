function adjustSelection(indices, baseAudioData, adjustmentValue) {
    var currentValue;
    var adjustedData = [];
    for (var i = 0; i < baseAudioData.length; i++) {
        if (i >= indices.startIndex && i <= indices.endIndex) {
            currentValue = adjustmentValue * baseAudioData[i];
        }
        else {
            currentValue = baseAudioData[i];
        }
        adjustedData.push(currentValue);
    }
    return adjustedData;
}
self.onmessage = function (e) {
    var _a = e.data, indices = _a.indices, baseAudioData = _a.baseAudioData, adjustmentValue = _a.adjustmentValue;
    var adjustedData = adjustSelection(indices, baseAudioData, adjustmentValue);
    self.postMessage(adjustedData);
};
export {};
