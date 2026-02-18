import { mean } from 'd3';

export function downsample(data: Float32Array, targetLength: number): number[] | undefined {
    try {
        if (data.length === 0) {
            throw new Error("Data array cannot be empty");
        }
        if (targetLength > data.length) {
            throw new Error("Downsample targetLength cannot be greater than the data's length");
        }
        if (targetLength <= 0) {
            throw new Error("targetLength cannot be less than or equal to zero");
        }
        const result: number[] = [];

        for (let i = 0; i < targetLength; i++) {
            const start = Math.round(i * data.length / targetLength);
            const end = Math.round((i + 1) * data.length / targetLength);
            const chunk = data.slice(start, end);
            result.push(mean(chunk)!);
        }

        return result;

    } catch (err) {
        console.error("Audio source could not be downsampled for visualization: ", err);
        throw new Error(err);
    }
}

if (typeof self !== "undefined") {
    self.onmessage = (e) => {
		const { data, targetLength } = e.data;
		const downsampledResult = downsample(data, targetLength);
		self.postMessage(downsampledResult);
	};
}
