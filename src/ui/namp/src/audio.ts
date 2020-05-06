import { sleep } from "./util";

interface ScheduledSource {
    start: number,
    stop: number,
    source: AudioBufferSourceNode
}

class AudioQueue {
    switchTime: number;
    index: number;
    finishCounter: number;
    context: AudioContext;
    sources: ScheduledSource[];
    currentPauseTime: number;

    constructor() {
        this.switchTime = 0;
        this.index = 0;
        this.finishCounter = 0;
        this.context = new AudioContext();
        this.sources = [];
        this.currentPauseTime = 0;
    }

    private findStartGapDuration = (audioBuffer: AudioBuffer) => {
        // Get the raw audio data for the left & right channels.
        const l = audioBuffer.getChannelData(0);
        const r = audioBuffer.getChannelData(1);
        // Each is an array of numbers between -1 and 1 describing
        // the waveform, sample by sample.

        // Now to figure out how long both channels remain at 0:
        for (let i = 0; i < l.length; i++) {
            if (l[i] || r[i]) {
                // Now we know which sample is non-zero, but we want
                // the gap in seconds, not samples. Thankfully sampleRate
                // gives us the number of samples per second.
                return i / audioBuffer.sampleRate;
            }
        }

        // Hmm, the clip is entirely silent
        return audioBuffer.duration;
    }

    private findEndGapDuration = (audioBuffer: AudioBuffer) => {
        // Get the raw audio data for the left & right channels.
        const l = audioBuffer.getChannelData(0);
        const r = audioBuffer.getChannelData(1);
        // Each is an array of numbers between -1 and 1 describing
        // the waveform, sample by sample.

        // Now to figure out how long both channels remain at 0:
        for (let i = l.length - 1; i >= 0; i--) {
            if (l[i] || r[i]) {
                // Now we know which sample is non-zero, but we want
                // the gap in seconds, not samples. Thankfully sampleRate
                // gives us the number of samples per second.
                return audioBuffer.duration - (i / audioBuffer.sampleRate);
            }
        }

        // Hmm, the clip is entirely silent
        return audioBuffer.duration;
    }

    private load = async (song: string, context: AudioContext) => {
        //const context = new AudioContext();
        const data = await fetch(song);
        const arrayBuffer = await data.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        return {
            audioBuffer,
            source,
            startGap: this.findStartGapDuration(audioBuffer),
            endGap: this.findEndGapDuration(audioBuffer)
        }
    }

    private schedule = async (song: string, onFinished: (playingRow: number) => void, playingRow: number, startOffset: number = 0) => {
        //const startOffset = this.index === 0 ? 0 : 0; // percentage - this will need to get passed in for pause/resume
        const songData = await this.load(`file://${song}`, this.context);
        let startSeconds = startOffset > 0 ? startOffset : songData.startGap;
        let currentSwitchTime = this.switchTime;
        if (this.switchTime === 0) {
            currentSwitchTime = this.context.currentTime;
        }
        const nextSwitchTime = currentSwitchTime + songData.audioBuffer.duration - startSeconds;
        let start = currentSwitchTime === 0 ? this.context.currentTime : currentSwitchTime;
        
        songData.source.start(start, startSeconds);
        console.log('starting at', startSeconds);
        songData.source.stop(nextSwitchTime);
        this.sources.push({source: songData.source, start, stop: nextSwitchTime })
        let self = this;
        songData.source.addEventListener('ended', function(b) {
            // don't fire when paused because we don't want to play the next track
            if (!self.sources.length) {
                return;
            }
            self.finishCounter++;
            if (self.finishCounter % 2 === 0) {
                // first source in the queue finished, don't need it anymore
                self.sources.shift();
                // current song finished, reset pause time for next song
                self.currentPauseTime = 0;
                onFinished(playingRow);
            }
        });
        this.switchTime = nextSwitchTime;
        this.index++;
    }

    private reset = () => {
        for (let song of this.sources) {
            song.source.stop();
        }
        this.switchTime = 0;
        this.sources = [];
    }
    
    private scheduleAll = async (songQueue: string[], playingRow: number, onFinished: (playingRow: number) => void, resumeTime: number) => {
        if (songQueue.length) {
            for (let song of songQueue) {
                console.log(song);
                await this.schedule(song, onFinished, playingRow, resumeTime);
                // Only use resume time for first song
                resumeTime = 0;
                playingRow++;
            }
        }
    }

    public start = async (songQueue: string[], playingRow: number, onFinished: (playingRow: number) => void) => {
        await this.scheduleAll(songQueue, playingRow, onFinished, this.currentPauseTime);
    }

    public pause() {
        if (!this.sources.length) {
            return;
        }
        const current = this.sources[0];
        if (!current) {
            return;
        }
        this.currentPauseTime = this.context.currentTime - current.start + this.currentPauseTime;
        this.reset();
    }

    public stop() {
        this.currentPauseTime = 0;
        this.reset();
    }
}

export const audioQueue = new AudioQueue();