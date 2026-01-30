import { mean } from 'd3';
function downsample(data, targetLength) {
    var result = [];
    var chunkSize = Math.floor(data.length / targetLength);
    var currentChunk = [];
    for (var i = 0; i <= data.length - chunkSize; i++) {
        if (currentChunk.length > 0 && i % chunkSize === 0) {
            var chunkAverage = mean(currentChunk);
            result.push(chunkAverage);
            currentChunk = [];
        }
        currentChunk.push(data[i]);
    }
    if (typeof result === "undefined") {
        console.error("Audio source could not be downsampled for visualization.");
        return;
    }
    return result;
}
self.onmessage = function (e) {
    var _a = e.data, data = _a.data, targetLength = _a.targetLength;
    var downsampledResult = downsample(data, targetLength);
    self.postMessage(downsampledResult);
};
