import type { Game } from '../../core/Game';
import { HapticController } from '../../core/HapticController';

export type InstrumentType = 'bell' | 'pluck' | 'chime' | 'drum' | 'click' | 'marimba' | 'flute' | 'bass';

export interface SequenceStep {
  active: boolean;
}

export interface TrackConfig {
  id: number;
  name: string;
  instrument: InstrumentType;
  color: string;
  activeColor: string;
  note: string;
  steps: SequenceStep[];
  muted: boolean;
  solo: boolean;
}

export interface PerformancePad {
  id: number;
  label: string;
  instrument: InstrumentType;
  note: string;
  color: string;
  activeColor: string;
  activeTimer: number; // For visual feedback animation
}

// 8 Pentatonic / standard notes for rows (High to Low or Low to High)
const SCALE_NOTES: string[] = ['C5', 'A4', 'G4', 'E4', 'D4', 'C4', 'A3', 'G3'];

const DEFAULT_INSTRUMENTS: InstrumentType[] = [
  'bell',
  'pluck',
  'chime',
  'marimba',
  'flute',
  'bass',
  'drum',
  'click',
];

const TRACK_COLORS = [
  { main: '#FF5E5E', active: '#FF9E9E' }, // Red
  { main: '#FF9F43', active: '#FFC076' }, // Orange
  { main: '#FECA57', active: '#FFE08A' }, // Yellow
  { main: '#1DD1A1', active: '#65EDC9' }, // Teal
  { main: '#48DBFB', active: '#8AE6FC' }, // Cyan
  { main: '#54A0FF', active: '#91C2FF' }, // Blue
  { main: '#9C88FF', active: '#C5B8FF' }, // Purple
  { main: '#FF6B6B', active: '#FFA8A8' }, // Pink
];

export class KhipuSynthGame implements Game {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly haptics: HapticController;

  // Audio Context & Nodes
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordDestination: MediaStreamAudioDestinationNode | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private isOfflineExporting = false;

  // State
  private paused = false;
  private soundEnabled = true;
  private isPlaying = true;
  private bpm = 120;
  private currentStep = 0;
  private stepTimer = 0;

  // Sequencer Data: 8 Tracks x 16 Steps
  private tracks: TrackConfig[] = [];
  private performancePads: PerformancePad[] = [];

  // Frequency Spectrum Data Array
  private spectrumData: Uint8Array = new Uint8Array(0);

  // Layout geometry cache
  private layout = {
    headerH: 50,
    spectrumH: 45,
    controlsH: 45,
    seqTop: 140,
    seqH: 0,
    seqW: 0,
    stepW: 0,
    rowH: 0,
    trackHeaderW: 90,
    padsTop: 0,
    padsH: 90,
  };

  // Hover / Interaction state
  private activeTouchId: number | null = null;
  private isDraggingBpm = false;

  constructor() {
    this.haptics = HapticController.getInstance();
    this.initTracks();
    this.initPads();
  }

  private initTracks() {
    this.tracks = [];
    for (let i = 0; i < 8; i++) {
      const steps: SequenceStep[] = [];
      for (let s = 0; s < 16; s++) {
        // Pre-populate some fun default pattern for kids
        const isActive = (i === 6 && s % 4 === 0) || // Drum on beat 1, 5, 9, 13
                         (i === 7 && (s % 2 === 1)) || // Click on off-beats
                         (i === 3 && (s === 0 || s === 7 || s === 10)) || // Marimba melody
                         (i === 0 && (s === 4 || s === 12)); // Bell accent
        steps.push({ active: isActive });
      }

      this.tracks.push({
        id: i,
        name: `Track ${i + 1}`,
        instrument: DEFAULT_INSTRUMENTS[i],
        color: TRACK_COLORS[i].main,
        activeColor: TRACK_COLORS[i].active,
        note: SCALE_NOTES[i],
        steps,
        muted: false,
        solo: false,
      });
    }
  }

  private initPads() {
    const padInstruments: InstrumentType[] = ['bell', 'pluck', 'chime', 'marimba', 'flute', 'bass', 'drum', 'click'];
    const padNotes = ['C5', 'E5', 'G5', 'C6', 'G4', 'C4', 'Kick', 'Hat'];
    const padLabels = ['Bell', 'Pluck', 'Chime', 'Marimba', 'Flute', 'Bass', 'Drum', 'Click'];

    this.performancePads = padLabels.map((label, idx) => ({
      id: idx,
      label,
      instrument: padInstruments[idx],
      note: padNotes[idx],
      color: TRACK_COLORS[idx].main,
      activeColor: TRACK_COLORS[idx].active,
      activeTimer: 0,
    }));
  }

  private initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);

        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount);

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;

    // Check localStorage sound setting
    const soundSetting = localStorage.getItem('soundEnabled');
    this.soundEnabled = soundSetting !== 'false';

    this.calculateLayout();

    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('mouseleave', this.handleMouseUp);

    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    this.initAudio();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(enabled ? 0.8 : 0, this.audioCtx.currentTime);
    }
  }

  public resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.calculateLayout();
    }
  }

  private calculateLayout() {
    if (!this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.layout.spectrumH = Math.min(50, Math.floor(h * 0.08));
    this.layout.controlsH = 50;
    this.layout.seqTop = this.layout.spectrumH + this.layout.controlsH + 10;
    this.layout.padsH = Math.min(90, Math.floor(h * 0.14));
    this.layout.padsTop = h - this.layout.padsH - 10;

    const availableSeqH = this.layout.padsTop - this.layout.seqTop - 10;
    this.layout.seqH = availableSeqH;
    this.layout.seqW = w - 16;
    this.layout.trackHeaderW = Math.max(75, Math.floor(w * 0.22));
    this.layout.stepW = (this.layout.seqW - this.layout.trackHeaderW) / 16;
    this.layout.rowH = this.layout.seqH / 8;
  }

  public update(dt: number): void {
    if (this.paused || !this.canvas || !this.ctx) return;

    // Audio Context Resume check
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    // Step Sequencer Playhead logic
    if (this.isPlaying) {
      // Step interval in ms: (60 / BPM) * 1000 / 4 (for 16th notes)
      const stepDuration = (60 / this.bpm) * 250;
      this.stepTimer += dt;

      if (this.stepTimer >= stepDuration) {
        this.stepTimer %= stepDuration;
        this.currentStep = (this.currentStep + 1) % 16;
        this.triggerStepNotes(this.currentStep);
      }
    }

    // Decay performance pads animation
    for (const pad of this.performancePads) {
      if (pad.activeTimer > 0) {
        pad.activeTimer = Math.max(0, pad.activeTimer - dt * 0.005);
      }
    }

    // Update spectrum visualizer data
    if (this.analyser && this.spectrumData.length > 0) {
      this.analyser.getByteFrequencyData(this.spectrumData as any);
    }

    this.render();
  }

  private triggerStepNotes(step: number) {
    if (!this.soundEnabled) return;

    const anySolo = this.tracks.some(t => t.solo);

    for (const track of this.tracks) {
      if (track.steps[step].active) {
        if (track.muted) continue;
        if (anySolo && !track.solo) continue;

        this.playInstrumentSound(track.instrument, track.note);
      }
    }
  }

  public triggerPad(pad: PerformancePad) {
    pad.activeTimer = 1.0;
    this.haptics.lightTap();
    if (this.soundEnabled) {
      this.playInstrumentSound(pad.instrument, pad.note);
    }
  }

  private playInstrumentSound(instrument: InstrumentType, note: string) {
    if (!this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const freq = this.noteToFreq(note);

    switch (instrument) {
      case 'bell':
        this.synthBell(freq, now);
        break;
      case 'pluck':
        this.synthPluck(freq, now);
        break;
      case 'chime':
        this.synthChime(freq, now);
        break;
      case 'marimba':
        this.synthMarimba(freq, now);
        break;
      case 'flute':
        this.synthFlute(freq, now);
        break;
      case 'bass':
        this.synthBass(freq, now);
        break;
      case 'drum':
        this.synthDrum(freq, now);
        break;
      case 'click':
        this.synthClick(freq, now);
        break;
      default:
        this.synthBell(freq, now);
    }
  }

  private noteToFreq(note: string): number {
    const notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    const match = note.toLowerCase().match(/^([a-g]#?)(\d+)$/);
    if (!match) {
      if (note === 'Kick') return 60;
      if (note === 'Hat') return 800;
      return 440;
    }
    const name = match[1];
    const octave = parseInt(match[2], 10);
    const index = notes.indexOf(name);
    const key = index + 12 * octave;
    return 440 * Math.pow(2, (key - 57) / 12);
  }

  // --- Clean Synthesizers with Envelopes and Auto-Stop ---
  private synthBell(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const partials = [1, 2, 2.4, 3];
    const gains = [0.4, 0.2, 0.15, 0.1];
    const decays = [1.0, 0.7, 0.5, 0.3];

    partials.forEach((ratio, i) => {
      if (!this.audioCtx || !this.masterGain) return;
      const osc = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, now);

      g.gain.setValueAtTime(gains[i], now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decays[i]);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + decays[i]);
    });
  }

  private synthPluck(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3, now);
    filter.frequency.exponentialRampToValueAtTime(freq, now + 0.15);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  private synthChime(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  private synthMarimba(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  private synthFlute(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  private synthBass(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.5, now); // 1 Octave lower

    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  private synthDrum(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2.5, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private synthClick(freq: number, now: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // --- Audio Recording & WAV Export ---
  public toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  public startRecording(): void {
    if (this.isRecording) return;
    this.initAudio();
    if (!this.audioCtx || !this.masterGain) return;

    try {
      if (typeof (this.audioCtx as any).createMediaStreamDestination === 'function') {
        this.recordDestination = (this.audioCtx as any).createMediaStreamDestination();
        this.masterGain.connect(this.recordDestination!);

        const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined;
        this.mediaRecorder = new MediaRecorder(this.recordDestination!.stream, options);

        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.exportRecordingBlob();
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.haptics.heavyImpact();
      } else {
        // Fallback to offline encoding
        this.isRecording = true;
        this.haptics.heavyImpact();
      }
    } catch (e) {
      console.warn('MediaRecorder error, falling back to offline WAV generation:', e);
      this.isRecording = true;
    }
  }

  public stopRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.haptics.lightTap();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.exportOfflineWav();
    }
  }

  private exportRecordingBlob(): void {
    if (this.recordedChunks.length === 0) {
      this.exportOfflineWav();
      return;
    }
    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    this.downloadBlob(blob, `khipu_loop_${Date.now()}.webm`);
  }

  public exportOfflineWav(): void {
    // Generate a 2-loop (32-step) offline render WAV file
    const sampleRate = 44100;
    const durationPerStep = (60 / this.bpm) * 0.25;
    const totalDuration = durationPerStep * 32; // 2 loops
    const totalFrames = Math.floor(sampleRate * totalDuration);

    const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineCtxClass) return;

    this.isOfflineExporting = true;
    const offlineCtx = new OfflineCtxClass(1, totalFrames, sampleRate);
    const offlineGain = offlineCtx.createGain();
    offlineGain.gain.value = 0.8;
    offlineGain.connect(offlineCtx.destination);

    // Schedule 32 steps of notes
    const anySolo = this.tracks.some(t => t.solo);
    for (let stepIdx = 0; stepIdx < 32; stepIdx++) {
      const step = stepIdx % 16;
      const stepTime = stepIdx * durationPerStep;

      for (const track of this.tracks) {
        if (track.steps[step].active) {
          if (track.muted || (anySolo && !track.solo)) continue;
          this.scheduleOfflineNote(offlineCtx, offlineGain, track.instrument, track.note, stepTime);
        }
      }
    }

    offlineCtx.startRendering().then((renderedBuffer: AudioBuffer) => {
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      this.downloadBlob(wavBlob, `khipu_synth_loop_${Date.now()}.wav`);
      this.isOfflineExporting = false;
    }).catch(err => {
      console.error('Offline audio rendering failed:', err);
      this.isOfflineExporting = false;
    });
  }

  private scheduleOfflineNote(ctx: OfflineAudioContext, destination: AudioNode, inst: InstrumentType, note: string, time: number) {
    const freq = this.noteToFreq(note);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    if (inst === 'drum') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 2.5, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
      g.gain.setValueAtTime(0.6, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g);
      g.connect(destination);
      osc.start(time);
      osc.stop(time + 0.15);
    } else {
      osc.type = inst === 'bass' ? 'sawtooth' : inst === 'pluck' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(g);
      g.connect(destination);
      osc.start(time);
      osc.stop(time + 0.4);
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      out.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data: number) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit resolution

    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out], { type: 'audio/wav' });
  }

  private downloadBlob(blob: Blob, filename: string) {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Touch & Mouse Event Handlers ---
  private readonly handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleInputStart(pos.x, pos.y);
  };

  private readonly handleMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingBpm) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleBpmDrag(pos.x);
  };

  private readonly handleMouseUp = () => {
    this.isDraggingBpm = false;
  };

  private readonly handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.activeTouchId = touch.identifier;
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handleInputStart(pos.x, pos.y);
    }
  };

  private readonly handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isDraggingBpm) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.activeTouchId) {
        const pos = this.getCanvasPos(touch.clientX, touch.clientY);
        this.handleBpmDrag(pos.x);
      }
    }
  };

  private readonly handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.isDraggingBpm = false;
  };

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  private handleInputStart(x: number, y: number) {
    if (this.paused || !this.canvas) return;

    // Audio Context Resume on user interaction
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    // 1. Check Control Bar (Play/Pause, BPM Slider, Record, Clear)
    const ctrlY = this.layout.spectrumH + 5;
    if (y >= ctrlY && y <= ctrlY + this.layout.controlsH) {
      // Play/Pause Button
      if (x >= 10 && x <= 60) {
        this.isPlaying = !this.isPlaying;
        this.haptics.lightTap();
        return;
      }

      // Record Button
      if (x >= 70 && x <= 120) {
        this.toggleRecording();
        return;
      }

      // BPM Slider
      const bpmSliderX = 140;
      const bpmSliderW = this.canvas.width - 250;
      if (x >= bpmSliderX - 10 && x <= bpmSliderX + bpmSliderW + 10) {
        this.isDraggingBpm = true;
        this.handleBpmDrag(x);
        return;
      }

      // Clear Pattern Button
      const clearX = this.canvas.width - 90;
      if (x >= clearX && x <= clearX + 80) {
        this.clearPattern();
        this.haptics.heavyImpact();
        return;
      }
    }

    // 2. Check Step Sequencer Grid
    const seqX = 8;
    if (y >= this.layout.seqTop && y <= this.layout.seqTop + this.layout.seqH) {
      const rowIdx = Math.floor((y - this.layout.seqTop) / this.layout.rowH);
      if (rowIdx >= 0 && rowIdx < 8) {
        const track = this.tracks[rowIdx];

        // Steps (16 Columns)
        const gridStartX = seqX + this.layout.trackHeaderW;
        if (x >= gridStartX && x <= seqX + this.layout.seqW) {
          const stepIdx = Math.floor((x - gridStartX) / this.layout.stepW);
          if (stepIdx >= 0 && stepIdx < 16) {
            track.steps[stepIdx].active = !track.steps[stepIdx].active;
            this.haptics.lightTap();
            if (track.steps[stepIdx].active && this.soundEnabled) {
              this.playInstrumentSound(track.instrument, track.note);
            }
            return;
          }
        }
      }
    }

    // 3. Check Performance Pads
    if (y >= this.layout.padsTop && y <= this.layout.padsTop + this.layout.padsH) {
      const padW = (this.canvas.width - 24) / 4;
      const padH = (this.layout.padsH - 8) / 2;

      for (let i = 0; i < this.performancePads.length; i++) {
        const r = Math.floor(i / 4);
        const c = i % 4;
        const px = 12 + c * (padW + 4);
        const py = this.layout.padsTop + r * (padH + 4);

        if (x >= px && x <= px + padW && y >= py && y <= py + padH) {
          this.triggerPad(this.performancePads[i]);
          return;
        }
      }
    }
  }

  private handleBpmDrag(x: number) {
    if (!this.canvas) return;
    const bpmSliderX = 140;
    const bpmSliderW = this.canvas.width - 250;
    const clampedX = Math.max(bpmSliderX, Math.min(bpmSliderX + bpmSliderW, x));
    const pct = (clampedX - bpmSliderX) / bpmSliderW;
    this.bpm = Math.round(60 + pct * 120); // 60 to 180 BPM
  }

  private cycleInstrument(track: TrackConfig) {
    const insts: InstrumentType[] = ['bell', 'pluck', 'chime', 'drum', 'click', 'marimba', 'flute', 'bass'];
    const currentIdx = insts.indexOf(track.instrument);
    const nextIdx = (currentIdx + 1) % insts.length;
    track.instrument = insts[nextIdx];
  }

  public clearPattern(): void {
    for (const track of this.tracks) {
      for (const step of track.steps) {
        step.active = false;
      }
    }
  }

  // --- Rendering Pipeline ---
  private render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    this.ctx.fillStyle = '#0f172a'; // Deep slate background
    this.ctx.fillRect(0, 0, w, h);

    this.renderSpectrumVisualizer(w);
    this.renderControls(w);
    this.renderSequencer(w);
    this.renderPerformancePads(w);
  }

  private renderSpectrumVisualizer(width: number) {
    if (!this.ctx) return;
    const specH = this.layout.spectrumH;

    // Dark bar background
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(0, 0, width, specH);

    if (this.spectrumData.length === 0) return;

    const barWidth = width / (this.spectrumData.length * 0.75);
    for (let i = 0; i < this.spectrumData.length; i++) {
      const val = this.spectrumData[i];
      const barHeight = (val / 255) * specH;

      const hue = (i / this.spectrumData.length) * 280 + 160;
      this.ctx.fillStyle = `hsl(${hue}, 85%, 60%)`;

      this.ctx.fillRect(
        i * barWidth,
        specH - barHeight,
        barWidth - 2,
        barHeight
      );
    }

    // Border line
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, specH);
    this.ctx.lineTo(width, specH);
    this.ctx.stroke();
  }

  private renderControls(width: number) {
    if (!this.ctx) return;
    const y = this.layout.spectrumH + 5;

    // 1. Play / Pause Button
    this.ctx.fillStyle = this.isPlaying ? '#22c55e' : '#eab308';
    this.roundRect(10, y + 5, 50, 36, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 13px Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.isPlaying ? 'PAUSE' : 'PLAY', 35, y + 23);

    // 2. Record Button
    this.ctx.fillStyle = this.isRecording ? '#ef4444' : '#475569';
    this.roundRect(68, y + 5, 55, 36, 8);
    this.ctx.fill();

    if (this.isRecording) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(82, y + 23, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(this.isRecording ? 'REC' : 'REC', 103, y + 23);

    // 3. BPM Slider Bar
    const sliderX = 135;
    const sliderW = width - 240;
    this.ctx.fillStyle = '#1e293b';
    this.roundRect(sliderX, y + 16, sliderW, 12, 6);
    this.ctx.fill();

    // Fill track
    const pct = (this.bpm - 60) / 120;
    this.ctx.fillStyle = '#3b82f6';
    this.roundRect(sliderX, y + 16, Math.max(12, sliderW * pct), 12, 6);
    this.ctx.fill();

    // Handle
    const handleX = sliderX + sliderW * pct;
    this.ctx.fillStyle = '#60a5fa';
    this.ctx.beginPath();
    this.ctx.arc(handleX, y + 22, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // BPM Label
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = 'bold 12px Fredoka, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${this.bpm} BPM`, sliderX, y + 8);

    // 4. Clear Button
    const clearX = width - 90;
    this.ctx.fillStyle = '#334155';
    this.roundRect(clearX, y + 5, 80, 36, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#f87171';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CLEAR', clearX + 40, y + 23);
  }

  private renderSequencer(_width: number) {
    if (!this.ctx) return;
    const seqX = 8;
    const top = this.layout.seqTop;

    // Outline container
    this.ctx.fillStyle = '#1e293b';
    this.roundRect(seqX, top, this.layout.seqW, this.layout.seqH, 12);
    this.ctx.fill();

    for (let r = 0; r < 8; r++) {
      const track = this.tracks[r];
      const rowY = top + r * this.layout.rowH;

      // Track Header (Instrument Label)
      this.ctx.fillStyle = track.color;
      this.roundRect(seqX + 2, rowY + 2, this.layout.trackHeaderW - 4, this.layout.rowH - 4, 6);
      this.ctx.fill();

      this.ctx.fillStyle = '#0f172a';
      this.ctx.font = 'bold 11px Fredoka, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        `${track.name.toUpperCase()} (${track.instrument.toUpperCase()})`,
        seqX + this.layout.trackHeaderW / 2,
        rowY + this.layout.rowH / 2
      );

      // 16 Step Buttons
      const gridStartX = seqX + this.layout.trackHeaderW;
      for (let s = 0; s < 16; s++) {
        const stepX = gridStartX + s * this.layout.stepW;
        const isCurrent = this.currentStep === s && this.isPlaying;
        const step = track.steps[s];

        if (step.active) {
          this.ctx.fillStyle = isCurrent ? '#ffffff' : track.color;
        } else {
          // Alternating beat shades
          const isMajorBeat = s % 4 === 0;
          this.ctx.fillStyle = isCurrent ? '#475569' : isMajorBeat ? '#334155' : '#0f172a';
        }

        this.roundRect(stepX + 1, rowY + 2, this.layout.stepW - 2, this.layout.rowH - 4, 4);
        this.ctx.fill();

        // Highlight playhead active step
        if (isCurrent) {
          this.ctx.strokeStyle = '#60a5fa';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      }
    }
  }

  private renderPerformancePads(width: number) {
    if (!this.ctx) return;
    const padW = (width - 24) / 4;
    const padH = (this.layout.padsH - 8) / 2;

    for (let i = 0; i < this.performancePads.length; i++) {
      const pad = this.performancePads[i];
      const r = Math.floor(i / 4);
      const c = i % 4;
      const px = 12 + c * (padW + 4);
      const py = this.layout.padsTop + r * (padH + 4);

      // Scale visual effect when triggered
      const scale = 1 + pad.activeTimer * 0.08;
      const isLit = pad.activeTimer > 0;

      this.ctx.save();
      if (isLit) {
        this.ctx.shadowColor = pad.activeColor;
        this.ctx.shadowBlur = 15 * pad.activeTimer;
      }

      this.ctx.fillStyle = isLit ? pad.activeColor : pad.color;
      this.roundRect(px, py, padW, padH, 10);
      this.ctx.fill();
      this.ctx.restore();

      // Pad Label
      this.ctx.fillStyle = '#0f172a';
      this.ctx.font = 'bold 12px Fredoka, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(pad.label, px + padW / 2, py + padH / 2);
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
      this.canvas.removeEventListener('mouseleave', this.handleMouseUp);

      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // Ignore
      }
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {
        // Ignore
      }
      this.audioCtx = null;
    }
  }
}
