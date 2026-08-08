import * as Tone from 'tone';
import type { IAudioEngine } from './IAudioEngine';
import { AudioController } from './AudioController';

export interface LightBoardAudioParams {
  red: number;   // 0 - 255
  green: number; // 0 - 255
  blue: number;  // 0 - 255
  brightness?: number; // 0.0 - 1.0
}

export class ToneAudioController implements IAudioEngine {
  private static instance: ToneAudioController;
  private isInitialized = false;
  private fallbackAudio = AudioController.getInstance();

  // Tone.js Synthesizer Pools (Gentle, warm, tactile sound design)
  private masterFilter: Tone.Filter | null = null;
  private fmSynth: Tone.FMSynth | null = null;
  private amSynth: Tone.AMSynth | null = null;
  private duoSynth: Tone.DuoSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private membraneSynth: Tone.MembraneSynth | null = null;
  private pluckSynth: Tone.PluckSynth | null = null;

  // Active continuous glide voices map
  private activeGlides: Map<string, { synth: Tone.Synth<any> | Tone.FMSynth | Tone.AMSynth | Tone.DuoSynth; panner?: Tone.Panner; note: number }> = new Map();

  private constructor() {}

  public static getInstance(): ToneAudioController {
    if (!ToneAudioController.instance) {
      ToneAudioController.instance = new ToneAudioController();
    }
    return ToneAudioController.instance;
  }

  public async init(): Promise<void> {
    await this.ensureInit();
  }

  private async ensureInit() {
    if (this.isInitialized) return;
    try {
      await Tone.start();
      
      try {
        // Warm master low-pass filter (1600Hz cutoff removes harsh high-frequency screeching)
        this.masterFilter = new Tone.Filter({
          frequency: 1600,
          type: 'lowpass',
          rolloff: -12
        }).toDestination();
      } catch {
        this.masterFilter = null;
      }

      const dest = this.masterFilter || Tone.getDestination();

      // Soft Warm FM Synth (Gentle glass & bell tones for RGB light sliders & chimes)
      try {
        this.fmSynth = new Tone.FMSynth({
          harmonicity: 1.0,
          modulationIndex: 1.5, // Low modulation index prevents harsh metallic distortion
          oscillator: { type: 'sine' },
          envelope: { attack: 0.03, decay: 0.25, sustain: 0.2, release: 0.5 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.1, release: 0.2 }
        }).connect(dest);
        this.fmSynth.volume.value = -12;
      } catch {
        this.fmSynth = null;
      }

      // Soft Warm AM Synth (Analog hum for Rotary Dimmer)
      try {
        this.amSynth = new Tone.AMSynth({
          harmonicity: 1.2,
          oscillator: { type: 'triangle' }, // Smooth triangle wave instead of harsh sawtooth
          envelope: { attack: 0.04, decay: 0.3, sustain: 0.4, release: 0.4 },
          modulation: { type: 'sine' }
        }).connect(dest);
        this.amSynth.volume.value = -14;
      } catch {
        this.amSynth = null;
      }

      // Gentle Duo Synth (Rainbow Crossfader glides)
      try {
        this.duoSynth = new Tone.DuoSynth({
          vibratoAmount: 0.15,
          vibratoRate: 4,
          harmonicity: 1.0,
          voice0: { oscillator: { type: 'sine' } },
          voice1: { oscillator: { type: 'sine' } }
        }).connect(dest);
        this.duoSynth.volume.value = -14;
      } catch {
        this.duoSynth = null;
      }

      // Warm Brown Noise Synth (Soft tactile rumbles)
      try {
        this.noiseSynth = new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.05 }
        }).connect(dest);
        this.noiseSynth.volume.value = -16;
      } catch {
        this.noiseSynth = null;
      }

      // Tactile Wood/Felt Membrane Synth (Satisfying warm click & thud like Contrast Inverter)
      try {
        this.membraneSynth = new Tone.MembraneSynth({
          pitchDecay: 0.03,
          octaves: 2.5,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.002, decay: 0.12, sustain: 0.01, release: 0.08 }
        }).connect(dest);
        this.membraneSynth.volume.value = -8;
      } catch {
        this.membraneSynth = null;
      }

      // Gentle Pluck Synth (Soft string plucks)
      try {
        this.pluckSynth = new Tone.PluckSynth({
          attackNoise: 0.4,
          dampening: 2000,
          resonance: 0.7
        }).connect(dest);
        this.pluckSynth.volume.value = -10;
      } catch {
        this.pluckSynth = null;
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('ToneAudioController initialization failed', err);
    }
  }

  /**
   * Sound Board: Plays harmonic pentatonic scale notes (Octave 5 glockenspiel-like).
   */
  public async playSoundBoardNote(noteIndex: number, octave: number = 5): Promise<void> {
    await this.ensureInit();
    const pentatonicScale = ['C', 'D', 'E', 'G', 'A'];
    const note = pentatonicScale[Math.abs(noteIndex) % pentatonicScale.length];
    const pitch = `${note}${octave}`;

    if (this.fmSynth) {
      this.fmSynth.triggerAttackRelease(pitch, '8n');
    }
  }

  /**
   * Light Board: Modulates frequency (150Hz-850Hz) dynamically based on active RGB values.
   */
  public async updateLightBoardTone(params: LightBoardAudioParams): Promise<void> {
    await this.ensureInit();
    const baseFreq = 150 + ((params.red * 2 + params.green * 1.5 + params.blue) / (255 * 4.5)) * 700;
    const brightness = params.brightness ?? 1.0;
    
    // Scale volume with brightness if provided
    if (this.fmSynth && typeof params.brightness === 'number') {
      const vol = -24 + brightness * 12; // -24dB to -12dB range
      this.fmSynth.volume.rampTo(vol, 0.05);
    }

    if (!this.activeGlides.has('lightboard')) {
      this.startGlide('lightboard', 'fm', baseFreq, brightness);
    } else {
      this.updateGlide('lightboard', baseFreq);
    }
  }

  /**
   * Stop continuous light board tone glissando on pointer release.
   */
  public stopLightBoardTone(): void {
    this.stopGlide('lightboard');
  }

  /**
   * Mechanical Click: Zero-latency pink noise impulse for switch flips and peg drops.
   */
  public async playTactileClick(): Promise<void> {
    await this.ensureInit();
    if (this.noiseSynth) {
      this.noiseSynth.triggerAttackRelease('16n');
    }
  }

  /**
   * Play any sound ID with gentle, warm Tone.js synthesis or registered sample fallbacks
   */
  public async play(id: string, arg?: string | number) {
    await this.ensureInit();
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (!soundEnabled) return;

    const freq = typeof arg === 'number' ? arg : typeof arg === 'string' ? Number.parseFloat(arg) || 440 : 440;

    try {
      if (id.startsWith('synth:')) {
        const instrument = id.split(':')[1];
        switch (instrument) {
          case 'pluck':
            if (this.pluckSynth) this.pluckSynth.triggerAttack(freq);
            break;
          case 'bell':
          case 'chime':
          case 'glass':
          case 'fm':
            if (this.fmSynth) this.fmSynth.triggerAttackRelease(freq, '8n');
            break;
          case 'drum':
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease(freq > 0 ? freq : 60, '8n');
            break;
          case 'click':
            // Warm satisfying wooden click (like Contrast Inverter)
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease(Math.min(300, Math.max(120, freq * 0.5)), '16n');
            break;
          case 'hum':
          case 'am':
            if (this.amSynth) this.amSynth.triggerAttackRelease(freq, '8n');
            break;
          default:
            if (this.fmSynth) this.fmSynth.triggerAttackRelease(freq, '8n');
            break;
        }
      } else if (id.startsWith('busyboard:')) {
        // Map tactile busyboard sound triggers to warm membrane / felt clicks (Contrast Inverter style)
        switch (id) {
          case 'busyboard:toggle_on':
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease('C3', '16n');
            break;
          case 'busyboard:toggle_off':
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease('A2', '16n');
            break;
          case 'busyboard:dip':
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease(freq > 0 ? Math.min(350, freq * 0.4) : 180, '16n');
            break;
          case 'busyboard:key_turn':
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease('E3', '16n');
            break;
          case 'busyboard:push_button':
            if (this.membraneSynth) this.membraneSynth.triggerAttackRelease('G2', '16n');
            break;
          default:
            this.fallbackAudio.play(id, arg);
            break;
        }
      } else {
        this.fallbackAudio.play(id, arg);
      }
    } catch (err) {
      console.warn('Tone.js play error', err);
    }
  }

  /**
   * Start a smooth gliding continuous tone for drag operations (gentle & warm)
   */
  public async startGlide(id: string, instrument: string, initialFreq: number, _volume = 0.25, pan = 0) {
    await this.ensureInit();
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (!soundEnabled) return;

    try {
      if (this.activeGlides.has(id)) {
        this.stopGlide(id);
      }

      // Soften glide frequencies to pleasant registers (120Hz – 600Hz)
      const pleasantFreq = Math.min(650, Math.max(120, initialFreq));

      let synthInstance: Tone.FMSynth | Tone.AMSynth | Tone.DuoSynth | null = null;
      if (instrument === 'windchime' && this.fmSynth) synthInstance = this.fmSynth;
      else if ((instrument === 'fm' || instrument === 'glass') && this.fmSynth) synthInstance = this.fmSynth;
      else if ((instrument === 'am' || instrument === 'hum' || instrument === 'dimmer') && this.amSynth) synthInstance = this.amSynth;
      else if (this.duoSynth) synthInstance = this.duoSynth;

      if (synthInstance) {
        const targetPitch = instrument === 'windchime' ? 329.63 : pleasantFreq;
        const dest = this.masterFilter || Tone.getDestination();
        const panner = new Tone.Panner(Math.max(-1, Math.min(1, pan))).connect(dest);
        synthInstance.connect(panner);
        synthInstance.triggerAttack(targetPitch);
        this.activeGlides.set(id, { synth: synthInstance, panner, note: targetPitch });
      }
    } catch (err) {
      console.warn('Tone.js startGlide error', err);
    }
  }

  /**
   * Smoothly ramp frequency (pitch-glissando) during drag movement
   */
  public updateGlide(id: string, targetFreq: number, _volume?: number, pan?: number) {
    const active = this.activeGlides.get(id);
    if (!active) return;

    try {
      if (typeof targetFreq === 'number') {
        const pleasantFreq = Math.min(650, Math.max(120, targetFreq));
        active.synth.setNote(pleasantFreq);
      }
      if (typeof pan === 'number' && active.panner) {
        active.panner.pan.rampTo(Math.max(-1, Math.min(1, pan)), 0.06);
      }
    } catch (err) {
      console.warn('Tone.js updateGlide error', err);
    }
  }

  /**
   * Smoothly release continuous tone on pointer release
   */
  public stopGlide(id: string) {
    const active = this.activeGlides.get(id);
    if (!active) return;

    try {
      active.synth.triggerRelease();
    } catch (err) {
      console.warn('Tone.js stopGlide error', err);
    } finally {
      this.activeGlides.delete(id);
    }
  }
}

