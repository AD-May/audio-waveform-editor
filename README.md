# Audio Waveform Editor

**Modify and visualize your audio files**

## Features

- Upload any .mp3 file less than 10MB

- Visualize and zoom in/out on a representation of the audio file's amplitude waveform

- Play/pause audio with real-time playhead tracking

- Ability to select regions on the waveform and edit their volume or trim them from the audio entirely

- Real-time playback stereo-panning control

- Export edited audio in .wav format

## Stack

[![React](https://skillicons.dev/icons?i=react)](https://skillicons.dev) React
[![TypeScript](https://skillicons.dev/icons?i=ts)](https://skillicons.dev) TypeScript
[![D3.js](https://skillicons.dev/icons?i=d3)](https://skillicons.dev) D3
[![Vite](https://skillicons.dev/icons?i=vite)](https://skillicons.dev) Vite
[![Vitest](https://skillicons.dev/icons?i=vitest)](https://skillicons.dev) Vitest

## APIs

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

## Architecture

- Utilization of Web Workers to process downsampling of audio for visualization, and re-processing the AudioBuffer on edit

- Custom hooks for separation of concerns (playback, handling audio data, creating audio context)

- D3.js for performant waveform rendering and user interaction

- .wav encoding from raw PCM data for export

## Getting Started

1. Clone the repo to your local machine
2. Run `npm install`
3. Run `npm run dev` to run application
4. Run `npm test` to run test suite


## Future

- [ ] Add more extensive error handling
- [ ] Add Component/Integration testing
- [ ] Include new editing capabilities



