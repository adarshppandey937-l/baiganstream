export class AudioBooster {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isConnected = false;

  public attach(videoElement: HTMLVideoElement): void {
    if (this.isConnected) return;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.gainNode = this.audioCtx.createGain();
      this.sourceNode = this.audioCtx.createMediaElementSource(videoElement);

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      this.isConnected = true;
    } catch {
      // Audio element might already have a source connected or restricted by CORS
    }
  }

  public setBoost(multiplier: number): void {
    // multiplier: 1.0 = normal, 2.0 = 200% volume boost
    if (this.gainNode && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.gainNode.gain.setValueAtTime(multiplier, this.audioCtx.currentTime);
    }
  }

  public disconnect(): void {
    try {
      if (this.audioCtx) {
        this.audioCtx.close();
      }
    } catch {
      // ignore
    }
    this.isConnected = false;
    this.audioCtx = null;
    this.sourceNode = null;
    this.gainNode = null;
  }
}
