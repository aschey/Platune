import { sleep } from "./util";

interface ScheduledSource {
    start: number,
    stop: number,
    source: AudioBufferSourceNode,
    analyser: AnalyserNode,
    id: number
}

class AudioQueue {
    switchTime: number;
    index: number;
    finishCounter: number;
    context: AudioContext;
    sources: ScheduledSource[];
    isPaused: boolean;
    currentAnalyser: AnalyserNode | null;

    constructor() {
        this.switchTime = 0;
        this.index = 0;
        this.finishCounter = 0;
        this.context = new AudioContext();
        this.sources = [];
        this.isPaused = false;
        this.currentAnalyser = null;
    }

    private findStartGapDuration = (audioBuffer: AudioBuffer) => {
        // Get the raw audio data for the left & right channels.
        const l = audioBuffer.getChannelData(0);
        const r = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : l;
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
        const r = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : l;
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
        let analyser = context.createAnalyser();
        source.connect(analyser);
        return {
            audioBuffer,
            analyser,
            source,
            startGap: this.findStartGapDuration(audioBuffer),
            endGap: this.findEndGapDuration(audioBuffer)
        }
    }

    private schedule = async (song: string, onFinished: (playingRow: number) => void, playingRow: number) => {
        //const startOffset = this.index === 0 ? 0 : 0; // percentage - this will need to get passed in for pause/resume
        const songData = await this.load(`file://${song}`, this.context);
        let startSeconds = songData.startGap;

        let currentSwitchTime = this.switchTime;
        if (this.switchTime === 0) {
            currentSwitchTime = this.context.currentTime;
        }
        const nextSwitchTime = currentSwitchTime + songData.audioBuffer.duration - startSeconds;
        let start = currentSwitchTime === 0 ? this.context.currentTime : currentSwitchTime;
        
        songData.source.start(start, startSeconds);
        console.log('starting at', startSeconds);
        songData.source.stop(nextSwitchTime);
        this.sources.push({source: songData.source, analyser: songData.analyser, start, stop: nextSwitchTime, id: playingRow });
        let self = this;
        songData.source.addEventListener('ended', function(_) {
            // don't fire when stopped because we don't want to play the next track (sources will be empty when stopped)
            // Sometimes this event fires twice so check the source to ensure we only call onFinished once
            if (!self.sources.length || this !== self.sources[0].source) {
                return;
            }
            // first source in the queue finished, don't need it anymore
            self.sources.shift();
            if (self.sources.length) {
                self.currentAnalyser = self.sources[0].analyser;
            }
            onFinished(playingRow);
        });
        this.switchTime = nextSwitchTime;
        this.index++;
        return songData.analyser;
    }

    private reset = () => {
        for (let song of this.sources) {
            song.source.stop();
        }
        this.switchTime = 0;
        this.sources = [];
    }
    
    private scheduleAll = async (songQueue: string[], playingRow: number, onFinished: (playingRow: number) => void) => {
        if (songQueue.length) {
            for (let song of songQueue) {
                console.log(song);
                let analyser = await this.schedule(song, onFinished, playingRow);
                if (song === songQueue[0]) {
                    this.currentAnalyser = analyser;
                }
                playingRow++;
            }
        }
    }

    public start = async (songQueue: string[], playingRow: number, onFinished: (playingRow: number) => void) => {
        if (this.isPaused) {
            this.isPaused = false;
            // todo: mute volume while resetting to prevent click
            this.context.resume();
            // Starting the song that's currently paused, don't reschedule
            if (this.sources.length && playingRow === this.sources[0].id) {
                return;
            }
            else {
                this.reset();
            }
        }
        await this.scheduleAll(songQueue, playingRow, onFinished);
    }

    public pause() {
        this.context.suspend();
        this.isPaused = true;
    }

    public stop() {
        this.reset();
    }
}

export const audioQueue = new AudioQueue();
