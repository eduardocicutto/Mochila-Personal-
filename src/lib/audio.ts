// Web Audio API Alarm Sound Synthesizer for WorkPacker

let activeAudioCtx: AudioContext | null = null;

export function stopAlarmSound() {
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch (e) {}
    activeAudioCtx = null;
  }
}

export function playAlarmSound(soundType: string = 'classic', volumePercent: number = 80) {
  stopAlarmSound();

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    activeAudioCtx = new AudioContextClass();
    const ctx = activeAudioCtx;
    const vol = (volumePercent || 80) / 100;

    const masterGain = ctx.createGain();
    masterGain.gain.value = vol;
    masterGain.connect(ctx.destination);

    switch (soundType) {
      case 'classic':
        playClassicAlarm(ctx, masterGain);
        break;
      case 'gentle':
        playGentleAlarm(ctx, masterGain);
        break;
      case 'urgent':
        playUrgentAlarm(ctx, masterGain);
        break;
      case 'bell':
        playBellAlarm(ctx, masterGain);
        break;
      case 'digital':
        playDigitalAlarm(ctx, masterGain);
        break;
      default:
        playClassicAlarm(ctx, masterGain);
    }

    // Auto stop after 15 seconds
    setTimeout(() => {
      stopAlarmSound();
    }, 15000);
  } catch (e) {
    console.error('Error playing alarm sound:', e);
  }
}

export function previewAlarmSound(soundType: string, volumePercent: number = 80) {
  playAlarmSound(soundType, volumePercent);
  setTimeout(() => {
    stopAlarmSound();
  }, 3000);
}

function playClassicAlarm(ctx: AudioContext, dest: GainNode) {
  const playBeep = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  for (let rep = 0; rep < 6; rep++) {
    const base = rep * 2;
    playBeep(880, ctx.currentTime + base, 0.25);
    playBeep(880, ctx.currentTime + base + 0.3, 0.25);
    playBeep(880, ctx.currentTime + base + 0.6, 0.25);
    playBeep(660, ctx.currentTime + base + 1.0, 0.8);
  }
}

function playGentleAlarm(ctx: AudioContext, dest: GainNode) {
  const notes = [523.25, 587.33, 659.25, 698.46, 783.99];
  for (let rep = 0; rep < 3; rep++) {
    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + rep * 4 + i * 0.6;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.55);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }
}

function playUrgentAlarm(ctx: AudioContext, dest: GainNode) {
  for (let rep = 0; rep < 10; rep++) {
    const base = rep * 1.2;
    for (let b = 0; b < 6; b++) {
      const startTime = ctx.currentTime + base + b * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  }
}

function playBellAlarm(ctx: AudioContext, dest: GainNode) {
  const playBell = (startTime: number) => {
    const freqs = [523.25, 1046.5, 1567.98, 2093];
    const gains = [0.4, 0.2, 0.1, 0.05];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gains[i], startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 2.5);
    });
  };

  for (let rep = 0; rep < 5; rep++) {
    playBell(ctx.currentTime + rep * 3);
  }
}

function playDigitalAlarm(ctx: AudioContext, dest: GainNode) {
  const pattern = [
    { freq: 1047, dur: 0.1 },
    { freq: 1319, dur: 0.1 },
    { freq: 1568, dur: 0.2 },
    { freq: 0, dur: 0.2 },
    { freq: 1568, dur: 0.1 },
    { freq: 1319, dur: 0.1 },
    { freq: 1047, dur: 0.2 },
    { freq: 0, dur: 0.6 },
  ];

  for (let rep = 0; rep < 5; rep++) {
    let offset = rep * 1.6;
    pattern.forEach((note) => {
      if (note.freq > 0) {
        const startTime = ctx.currentTime + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = note.freq;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur * 0.9);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + note.dur);
      }
      offset += note.dur;
    });
  }
}
