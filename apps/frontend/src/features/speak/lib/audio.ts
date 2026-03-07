import { AUDIO } from './constants';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (sharedAudioContext === null || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ sampleRate: AUDIO.SAMPLE_RATE });
  }
  return sharedAudioContext;
}

export async function blobToWav(blob: Blob): Promise<ArrayBuffer> {
  const audioContext = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const numChannels = 1;
  const sampleRate = AUDIO.SAMPLE_RATE;
  const bitsPerSample = 16;
  const numSamples = audioBuffer.length;

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const channelData = audioBuffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const rawSample = channelData[i] ?? 0;
    const sample = Math.max(-1, Math.min(1, rawSample));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}
