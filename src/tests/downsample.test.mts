import { describe, it, expect } from "vitest";
import { downsample } from "../utils/downsample.mts";

const data = new Float32Array([0.2, -0.45, -1.34, 4.223, 1.23]);

describe("throws errors", () => {
	it("should throw error if targetLength is greater than length of data array", () => {
		expect(() => downsample(data, 6)).toThrowError(
			"Downsample targetLength cannot be greater than the data's length",
		);
	});
	it("should throw an error if targetLength is equal to 0", () => {
		expect(() => downsample(data, 0)).toThrowError(
			"targetLength cannot be less than or equal to zero",
		);
	});
	it("should throw an error if targetLength is less than 0", () => {
		expect(() => downsample(data, -1)).toThrowError(
			"targetLength cannot be less than or equal to zero",
		);
	});
	it("should throw an error if there is no data in the passed array", () => {
		expect(() => downsample([] as any, 4)).toThrowError("Data array cannot be empty");
	});
});

describe("return value", () => {
	it("should return the correct amount of samples", () => {
		const result = downsample(data, 2);
		expect(result?.length).toEqual(2);
	});
	it("should return the correct value (happy path)", () => {
		const result = downsample(data, 3);
		const expected = [
			-0.1249999925494194, -1.340000033378601, 2.7265000343322754,
		];
		expect(result).toEqual(expected);
	});
    it("should return the correct value if size of data is 1", () => {
        const dataOneLength = new Float32Array([0.549]);
        const result = downsample(dataOneLength, 1);
        const expected = [0.549];
        expect([parseFloat(result![0].toFixed(3))]).toEqual(expected);
    });
    it("should return the same array if the targetLength is equal to the data's length", () => {
        const targetLength = 5;
        const result = downsample(data, targetLength);
        expect(result?.length === targetLength);
    });
});
