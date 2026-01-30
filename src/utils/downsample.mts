import { mean } from 'd3';

function downsample(data: Float32Array, targetLength: number): number[] | void {
    const result: number[] | undefined = [];
    const chunkSize = Math.floor(data.length / targetLength);
    let currentChunk = [];

    for (let i = 0; i <= data.length - chunkSize; i++) {
        if (currentChunk.length > 0 && i % chunkSize === 0) {
            const chunkAverage = mean(currentChunk);
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

self.onmessage = (e) => {
    const { data, targetLength } = e.data;
    const downsampledResult = downsample(data, targetLength);
    self.postMessage(downsampledResult);
};