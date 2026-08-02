import { BaseBusyBoardModule } from './BaseBusyBoardModule';

export class StereoPannerModule extends BaseBusyBoardModule {
  protected readonly game: any;
  private panValue = 0.5; // 0.0 = Left (-1.0), 0.5 = Center (0.0), 1.0 = Right (+1.0)
  private isDragging = false;
  private animWavePhase = 0;

  constructor(id: string, x: number, y: number, w: number, h: number, game: any) {
    super(id, x, y, w, h);
    this.game = game;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const theme = this.game.getTheme ? this.game.getTheme() : 'paper';
    const isPaper = theme === 'paper';
    this.animWavePhase += 0.05;

    ctx.save();

    // Module background panel
    ctx.fillStyle = isPaper ? '#FDFBF7' : '#141824';
    ctx.strokeStyle = isPaper ? '#E3D7C1' : '#2A364F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px + 6, py + 6, pw - 12, ph - 12, 16);
    ctx.fill();
    ctx.stroke();

    // Header Title
    ctx.fillStyle = isPaper ? '#6E6659' : '#8A99B5';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STEREO PAN FADER', px + pw / 2, py + 24);

    // Track Geometry
    const trackPadding = 45;
    const trackStartX = px + trackPadding;
    const trackEndX = px + pw - trackPadding;
    const trackY = py + ph / 2 + 2;
    const trackW = trackEndX - trackStartX;

    // Track background slot
    ctx.fillStyle = isPaper ? '#EADFC9' : '#0B0D13';
    ctx.beginPath();
    ctx.roundRect(trackStartX, trackY - 6, trackW, 12, 6);
    ctx.fill();

    // Active Pan Fill Glow
    const audioPan = (this.panValue - 0.5) * 2; // -1.0 to +1.0
    const puckX = trackStartX + this.panValue * trackW;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(trackStartX, trackY - 6, trackW, 12, 6);
    ctx.clip();

    const centerPos = trackStartX + 0.5 * trackW;
    ctx.fillStyle = isPaper ? 'rgba(217, 119, 6, 0.4)' : 'rgba(0, 230, 204, 0.5)';
    ctx.fillRect(Math.min(centerPos, puckX), trackY - 6, Math.abs(puckX - centerPos), 12);
    ctx.restore();

    // Left and Right Channel Labels / Icons
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = isPaper ? (audioPan < -0.1 ? '#D97706' : '#9E9484') : (audioPan < -0.1 ? '#00E6CC' : '#4E5D78');
    ctx.textAlign = 'center';
    ctx.fillText('L', trackStartX - 20, trackY + 4);

    ctx.fillStyle = isPaper ? (audioPan > 0.1 ? '#D97706' : '#9E9484') : (audioPan > 0.1 ? '#00E6CC' : '#4E5D78');
    ctx.fillText('R', trackEndX + 20, trackY + 4);

    // Animated Soundwave Ripples (radiating from puck when dragged)
    if (this.isDragging) {
      ctx.save();
      const numWaves = 3;
      for (let i = 0; i < numWaves; i++) {
        const offset = ((this.animWavePhase + i * 0.8) % 2.5) * 14;
        const alpha = Math.max(0, 1 - offset / 35);
        ctx.strokeStyle = isPaper ? `rgba(217, 119, 6, ${alpha * 0.6})` : `rgba(0, 230, 204, ${alpha * 0.7})`;
        ctx.lineWidth = 2;

        // Left arc
        ctx.beginPath();
        ctx.arc(puckX - offset, trackY, 6 + offset * 0.5, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();

        // Right arc
        ctx.beginPath();
        ctx.arc(puckX + offset, trackY, 6 + offset * 0.5, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Puck Knob
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = isPaper ? '#FFFDF8' : '#222B3D';
    ctx.strokeStyle = isPaper ? (this.isDragging ? '#D97706' : '#C5B79F') : (this.isDragging ? '#00E6CC' : '#4A5B7B');
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(puckX, trackY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Center indicator dot on puck
    ctx.fillStyle = isPaper ? '#D97706' : '#00E6CC';
    ctx.beginPath();
    ctx.arc(puckX, trackY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Subtitle Pan Reading
    ctx.font = '10px sans-serif';
    ctx.fillStyle = isPaper ? '#8C8273' : '#6C7D9C';
    ctx.textAlign = 'center';

    let panText = 'CENTER';
    const percent = Math.abs(Math.round(audioPan * 100));
    if (audioPan < -0.05) {
      panText = `LEFT ${percent}%`;
    } else if (audioPan > 0.05) {
      panText = `RIGHT ${percent}%`;
    }

    ctx.fillText(panText, px + pw / 2, py + ph - 16);

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const trackPadding = 45;
    const trackStartX = px + trackPadding;
    const trackEndX = px + pw - trackPadding;
    const trackY = py + ph / 2 + 2;

    const hitMargin = 25;
    if (x >= trackStartX - hitMargin && x <= trackEndX + hitMargin && Math.abs(y - trackY) <= hitMargin) {
      this.isDragging = true;
      this.updatePanFromPointer(x, trackStartX, trackEndX);
      this.triggerAudioGlideStart();
      this.haptics.lightTap();
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, _y: number, px: number, _py: number, pw: number, _ph: number): void {
    if (!this.isDragging) return;

    const trackPadding = 45;
    const trackStartX = px + trackPadding;
    const trackEndX = px + pw - trackPadding;

    this.updatePanFromPointer(x, trackStartX, trackEndX);
    this.triggerAudioGlideUpdate();
  }

  public handlePointerUp(_x: number, _y: number, _px: number, _py: number, _pw: number, _ph: number): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.audio.stopGlide('stereo_panner');
      this.haptics.lightTap();
    }
  }

  private updatePanFromPointer(x: number, trackStartX: number, trackEndX: number) {
    const trackW = trackEndX - trackStartX;
    const clampedX = Math.max(trackStartX, Math.min(trackEndX, x));
    this.panValue = (clampedX - trackStartX) / trackW;
  }

  private triggerAudioGlideStart() {
    const audioPan = (this.panValue - 0.5) * 2; // -1.0 to +1.0
    // Fixed pitch (329.63Hz E4 chime) and fixed volume (0.25), ONLY panning changes
    this.audio.startGlide('stereo_panner', 'windchime', 329.63, 0.25, audioPan);
  }

  private triggerAudioGlideUpdate() {
    const audioPan = (this.panValue - 0.5) * 2; // -1.0 to +1.0
    this.audio.updateGlide('stereo_panner', 329.63, 0.25, audioPan);
  }
}
