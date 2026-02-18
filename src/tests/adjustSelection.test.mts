import { describe, it, expect } from "vitest";
import { adjustSelection } from "../utils/adjustSelection.mts";

const data = [0.45, 0.222, -8.4, -4.235, .234];
const indices = { startIndex: 2, endIndex: 4 };
const audioData = { type: "audio", data: data };
const adjustmentValue = 0.5;

describe("throws errors", () => {
    it("should throw an error if audioData.type is not 'audio' or 'visual'", () => {
        const invalidAudioData = { type: "apple", data: data };
        expect(() => adjustSelection(indices, invalidAudioData, adjustmentValue)).toThrowError(
            "audioData.type cannot be a string other than 'visual' or 'audio'."
        );
    });
    it("should throw an error if audioData.data is an empty array", () => {
        const invalidData = { type: "audio", data: [] };
        expect(() =>
			adjustSelection(indices, invalidData, adjustmentValue),
		).toThrowError("audioData.data cannot be an empty array");
    });
    it("should throw an error if adjustmentValue is greater than 100 or less than 100", () => {
        const error = "adjustmentValue cannot be outside the ranges of -100 to 100";
        expect(() => adjustSelection(indices, audioData, -101)).toThrowError(error);
        expect(() => adjustSelection(indices, audioData, 101)).toThrowError(error);
        expect(() => adjustSelection(indices, audioData, -10000)).toThrowError(error);
        expect(() => adjustSelection(indices, audioData, 10000)).toThrowError(error);
    });
});

describe("return value", () => {
    it("should return the correct array when provided adjustmentValue", () => {
        const result = adjustSelection(indices, audioData, adjustmentValue);
        const expected = data.map((el, i) => {
            if (i >= indices.startIndex && i <= indices.endIndex) {
                return el * adjustmentValue;
            } else {
                return el;
            }
        });
        expect(result).toEqual(expected);
    });
    it("should return the correct array when adjustmentValue not provided", () => {
        const result = adjustSelection(indices, audioData);
        const expected = data.map((el, i) => {
            if (i >= indices.startIndex && i <= indices.endIndex) {
				return el * 0;
			} else {
				return el;
			}
        });
        expect(result).toEqual(expected);
    });
})