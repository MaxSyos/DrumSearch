import React, { useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { Midi } from '@tonejs/midi';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassSlider from '../components/GlassSlider';
import GlassSwitch from '../components/GlassSwitch';
// Mapeamento EZdrummer (Americana EZX) para grid/playback
// Ordem: Kick, Snare, Rimshot, HiHat (Fechado), HiHat (Aberto), HiHat (Pedal), Tom1, Tom2, FloorTom, Crash, Ride
const EZDRUMMER_NOTES = [
  36, // Kick (C1)
  38, // Snare (D1)
  37, // Rimshot (Caixa Borda, C#1)
  42, // HiHat Fechado (F#1)
  46, // HiHat Aberto (A#1)
  44, // HiHat Pedal (G#1)
  50, // Tom1 (D2)
  47, // Tom2 (B1)
  43, // FloorTom (G1)
  49, // Crash (C#2)
  51, // Ride (D#2)
];

// Mapeamento Cakewalk/GM para exportação
// Novo mapeamento Cakewalk Bandlab para exportação
// Ordem: Kick, Snare, Rimshot, HiHat (Fechado), HiHat (Aberto), HiHat (Pedal), Tom1, Tom2, FloorTom, Crash, Ride
const CAKEWALK_NOTES = [
  36, // Kick (C2)
  38, // Snare (D2)
  37, // Rimshot (C#2)
  42, // HiHat Fechado (F#2)
  46, // HiHat Aberto (A#2)
  44, // HiHat Pedal (G#2)
  48, // Tom1 (C3)
  47, // Tom2 (A2)
  43, // FloorTom/Surdo (G2)
  49, // Crash (C#3)
  51, // Ride (D#3)
];

// Gera um arquivo MIDI real a partir do grid, convertendo para Cakewalk/GM
async function gridToMidi(grid: boolean[][], steps: number, tempo: number = 120): Promise<Uint8Array> {
  const midi = new Midi();
  midi.header.setTempo(tempo);
  const channel = 9; // canal de bateria padrão
  const track = midi.addTrack();
  const stepDuration = 0.25; // 1/16
  for (let d = 0; d < grid.length; d++) {
    for (let s = 0; s < steps; s++) {
      if (grid[d][s]) {
        // Mapeia nota EZdrummer (entrada) para nota Cakewalk (exportação)
        track.addNote({
          midi: CAKEWALK_NOTES[d] || 36,
          time: s * stepDuration,
          duration: 0.2,
          velocity: 0.8,
        });
      }
    }
  }
  return midi.toArray();
}

type Drum = { name: string; label: string; file: string };
const DRUMS: Drum[] = [
  { name: 'Kick', label: 'Bumbo', file: 'kick.wav' },
  { name: 'Snare', label: 'Caixa', file: 'snare.wav' },
  { name: 'Rimshot', label: 'Borda Caixa', file: 'snareRim.wav' },
  { name: 'HiHat', label: 'Chimbal', file: 'hihat.wav' },
  { name: 'OpenHiHat', label: 'Chimbal Aberto', file: 'openHihat.wav' },
  { name: 'MidHiHat', label: 'Chimbal Meio', file: 'midHihat.wav' },
  { name: 'Tom1', label: 'Tom 1', file: 'tom1.wav' },
  { name: 'Tom2', label: 'Tom 2', file: 'tom2.wav' },
  { name: 'FloorTom', label: 'Surdo', file: 'floortom.wav' },
  { name: 'Crash', label: 'Crash', file: 'crash.wav' },
  { name: 'Ride', label: 'Ride', file: 'ride.wav' },
];

const MIN_STEPS = 8;
const MAX_STEPS = 16;

type SearchResult = { id: string; filename: string; distance: number };

export default function DrumMachine() {
  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(true);
  // Carrega os samples de áudio
  const audioRefs = React.useRef<HTMLAudioElement[]>([]);
  // Referência para o som do metrônomo
  const metronomeRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => {
    audioRefs.current = DRUMS.map((drum, idx) => {
      const audio = new window.Audio(`/sounds/${drum.file}`);
      audio.preload = 'auto';
      return audio;
    });
    // Carrega sample do metrônomo (pode ser um click.wav, senão usa beep do browser)
    metronomeRef.current = new window.Audio('/sounds/metronome.wav');
    if (metronomeRef.current) metronomeRef.current.preload = 'auto';
  }, []);

  function playDrum(idx: number) {
    const audio = audioRefs.current[idx];
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
    // Aqui você pode adicionar lógica para enviar nota MIDI EZdrummer se integrar com hardware/MIDI out
  }
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number>(120);
  const [steps, setSteps] = useState<number>(MIN_STEPS);
  type GridType = boolean[][];
  const [grid, setGrid] = useState<GridType>(
    Array(DRUMS.length)
      .fill(0)
      .map(() => Array(MIN_STEPS).fill(false))
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [volume, setVolume] = useState<number>(1);
  // Novo estado para armazenar vetor rítmico importado
  const [importedRhythm, setImportedRhythm] = useState<number[] | null>(null);
  const [importedBpm, setImportedBpm] = useState<number | null>(null);
  // Estado para ativar/desativar metrônomo
  const [metronomeOn, setMetronomeOn] = useState<boolean>(true);

  // Atualiza o volume do metrônomo ao alternar o botão
  React.useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.volume = metronomeOn ? 1 : 0;
    }
  }, [metronomeOn]);

  // Mapeamento de teclas para instrumentos
  const keyToDrum: { [key: string]: number } = {
    q: 0, // Kick
    w: 1, // Snare
    x: 2, // Rimshot (Borda Caixa)
    e: 3, // HiHat
    a: 4, // OpenHiHat
    s: 5, // MidHiHat
    r: 6, // Tom1
    t: 7, // Tom2
    y: 8, // FloorTom
    u: 9, // Crash
    i: 10, // Ride
  };

  // Atualiza o grid ao mudar steps (mantém o que for possível)
  React.useEffect(() => {
    setGrid((prev) =>
      prev.map((row) => {
        if (steps > row.length) {
          return [...row, ...Array(steps - row.length).fill(false)];
        } else if (steps < row.length) {
          return row.slice(0, steps);
        }
        return row;
      })
    );
    setCurrentStep(0);
  }, [steps]);

  // Ativa/desativa pad via teclado e toca o som, barra de espaço liga/desliga Play/REC
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlay();
        return;
      }
      const drumIdx = keyToDrum[e.key.toLowerCase()];
      if (typeof drumIdx === 'number') {
        setGrid((prev: GridType) => {
          const copy = prev.map((row) => [...row]);
          copy[drumIdx][currentStep] = !copy[drumIdx][currentStep];
          return copy;
        });
        playDrum(drumIdx);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  function handleDrumClick(drumIdx: number) {
    setGrid((prev: GridType) => {
      const copy = prev.map((row) => [...row]);
      copy[drumIdx][currentStep] = !copy[drumIdx][currentStep];
      return copy;
    });
    playDrum(drumIdx);
  }

  // Exporta o grid para vetor rítmico (histograma de onsets por step)
  function exportRhythmVector(): number[] {
    const vector = Array(steps).fill(0);
    for (let s = 0; s < steps; s++) {
      let sum = 0;
      for (let d = 0; d < DRUMS.length; d++) {
        if (grid[d][s]) sum += 1;
      }
      vector[s] = sum;
    }
    // Normaliza para [0,1]
    const max = Math.max(...vector, 1);
    return vector.map((v) => v / max);
  }

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      let rhythm_vector: number[];
      let bpmToUse = bpm;
      if (importedRhythm) {
        rhythm_vector = importedRhythm;
        if (importedBpm) bpmToUse = importedBpm;
      } else {
        rhythm_vector = exportRhythmVector();
      }
      if (rhythm_vector.length !== steps && !importedRhythm) {
        setError(`O vetor rítmico deve ter ${steps} posições.`);
        setLoading(false);
        return;
      }
      // Preenche para 32 dimensões (API espera 32)
      const vector32 = [...rhythm_vector, ...Array(32 - rhythm_vector.length).fill(0)];
      const params = new URLSearchParams();
      vector32.forEach((v) => params.append('rhythm_vector', v.toString()));
      params.append('bpm', bpmToUse.toString());
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await axios.get(`${apiUrl}/api/search?${params.toString()}`);
      setResults(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao buscar similaridade');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const midiData = await gridToMidi(grid, steps, bpm);
      const blob = new Blob([midiData], { type: 'audio/midi' });
      saveAs(blob, 'loop.mid');
    } catch (e: any) {
      setError('Erro ao exportar MIDI');
    }
  }

  // Importa arquivo MIDI do usuário, preenche o grid e extrai vetor rítmico
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const file = e.target.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      const stepsToUse = steps;
      // Preencher grid: linhas = instrumentos, colunas = steps
      const newGrid: boolean[][] = Array(DRUMS.length).fill(0).map(() => Array(stepsToUse).fill(false));
      let midiBpm = midi.header.tempos[0]?.bpm || bpm;
      // Descobrir duração total do loop (em ticks ou segundos)
      let maxTime = 0;
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          if (note.time > maxTime) maxTime = note.time;
        });
      });
      // Se não houver notas, aborta
      if (maxTime === 0) throw new Error('MIDI vazio');
      // Mapeamento: nota MIDI -> índice do grid (EZdrummer)
      const noteToIdx: { [note: number]: number } = {};
      EZDRUMMER_NOTES.forEach((n, idx) => { noteToIdx[n] = idx; });
      // Preencher grid
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          const drumIdx = noteToIdx[note.midi];
          if (typeof drumIdx === 'number') {
            // Calcula step proporcional ao tempo da nota
            const step = Math.floor((note.time / maxTime) * stepsToUse);
            if (step >= 0 && step < stepsToUse) {
              newGrid[drumIdx][step] = true;
            }
          }
        });
      });
      setGrid(newGrid);
      // Extrai vetor rítmico do novo grid
      const rhythm = Array(stepsToUse).fill(0);
      for (let s = 0; s < stepsToUse; s++) {
        let sum = 0;
        for (let d = 0; d < DRUMS.length; d++) {
          if (newGrid[d][s]) sum += 1;
        }
        rhythm[s] = sum;
      }
      const max = Math.max(...rhythm, 1);
      setImportedRhythm(rhythm.map(v => v / max));
      setImportedBpm(midiBpm);
    } catch (e: any) {
      setError('Erro ao importar MIDI');
    } finally {
      setLoading(false);
    }
  }
  function handleClear() {
    setGrid(Array(DRUMS.length).fill(0).map(() => Array(steps).fill(false)));
  }
  // Define o número de tempos do compasso (4/4 padrão)
  const BEATS_PER_BAR = 4;
  // Quantos steps por tempo (beat)?
  const stepsPerBeat = steps / BEATS_PER_BAR;

  function playMetronome(step: number) {
    // Toca metrônomo em todo início de tempo (beat)
    if (step % stepsPerBeat === 0) {
      if (metronomeRef.current) {
        metronomeRef.current.currentTime = 0;
        metronomeRef.current.play();
      } else {
        // fallback beep
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = 2000;
        g.gain.value = metronomeOn ? 0.1 : 0;
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.05);
        setTimeout(() => ctx.close(), 100);
      }
    }
  }

  function handlePlay() {
    if (isPlaying) {
      if (intervalId) clearInterval(intervalId);
      setIsPlaying(false);
      setIntervalId(null);
      return;
    }
    setIsPlaying(true);
    // Calcula o tempo de cada step em ms baseado no BPM e stepsPerBeat
    // BPM = batidas (tempos) por minuto, cada tempo = stepsPerBeat steps
    const stepMs = 60000 / (bpm * stepsPerBeat); // tempo de cada step
    if (metronomeOn) playMetronome(0);
    const id = setInterval(() => {
      setCurrentStep((step: number) => (step + 1) % steps);
    }, stepMs);
    setIntervalId(id);
  }

  // Atualiza o intervalo do play/rec ao mudar o BPM
  // Toca os pads ativos do step atual durante o loop e o metrônomo
  React.useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(0);
      return;
    }
    if (intervalId) clearInterval(intervalId);
    const stepMs = 60000 / (bpm * stepsPerBeat);
    const id = setInterval(() => {
      setCurrentStep((step: number) => {
        const nextStep = (step + 1) % steps;
        playMetronome(nextStep);
        // Toca todos os pads ativos do próximo step
        grid.forEach((row, drumIdx) => {
          if (row[nextStep]) playDrum(drumIdx);
        });
        return nextStep;
      });
    }, stepMs);
    setIntervalId(id);
    return () => { if (id) clearInterval(id); };
  }, [bpm, isPlaying, grid, steps]);

  React.useEffect(() => {
    audioRefs.current.forEach(audio => {
      if (audio) audio.volume = volume;
    });
  }, [volume, steps]);

  // Paleta retro moderna
  const colors = darkMode
    ? {
        bg: 'rgba(24,20,32,0.92)',
        fg: '#f8f8f8',
        border: '#2e2e3a',
        padOn: 'rgba(0,255,128,0.85)',
        padOff: 'rgba(40,40,50,0.7)',
        padShadow: '0 4px 24px #000a',
        button: 'rgba(40,40,50,0.45)',
        buttonText: '#fff',
        accent: '#ff2e63',
        error: '#ff2e63',
        glass: 'rgba(40,40,50,0.45)',
      }
    : {
        bg: 'rgba(245,240,230,0.92)',
        fg: '#232323',
        border: '#bbb',
        padOn: 'rgba(0,200,120,0.85)',
        padOff: 'rgba(240,240,240,0.7)',
        padShadow: '0 4px 24px #8884',
        button: 'rgba(255,255,255,0.7)',
        buttonText: '#232323',
        accent: '#ff2e63',
        error: '#c00',
        glass: 'rgba(255,255,255,0.35)',
      };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        background: `${colors.bg} url('/image/cena-relacionada-a-musica-em-3d.jpg') center center/cover no-repeat fixed`,
        color: colors.fg,
        overflowX: 'hidden',
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      {/* Switch Dark Mode */}
      <div style={{ position: 'absolute', top: 24, right: 36, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.accent, letterSpacing: 2, textShadow: '0 2px 8px #000a' }}>DrumStudio</span>
        <GlassSwitch checked={darkMode} onChange={() => setDarkMode((v) => !v)} />
      </div>
      <div style={{ paddingTop: 64, maxWidth: 980, margin: '0 auto' }}>
        <h2 style={{ color: colors.fg, fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 38, letterSpacing: 2, textShadow: '0 2px 12px #000a', marginBottom: 24, textAlign: 'center' }}>
          Drum Machine Studio
        </h2>
        <GlassCard style={{ marginBottom: 32, background: colors.glass, border: `2px solid ${colors.accent}` }}>
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            <GlassButton
              onClick={() => setMetronomeOn((on) => !on)}
              title={metronomeOn ? 'Desligar Metrônomo' : 'Ligar Metrônomo'}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: metronomeOn ? colors.accent : colors.button,
                color: metronomeOn ? '#fff' : colors.buttonText,
                fontSize: 20,
                marginRight: 8,
                boxShadow: metronomeOn ? `0 0 8px ${colors.accent}` : 'none',
                padding: 0,
              }}
            >
              <span role="img" aria-label="Metrônomo">{metronomeOn ? '🔊' : '🔇'}</span>
            </GlassButton>
            <label htmlFor="bpm-input" style={{ fontWeight: 'bold', marginRight: 8, color: colors.fg }}>BPM:</label>
            <GlassInput
              id="bpm-input"
              type="number"
              min={40}
              max={300}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              style={{ width: 80, fontSize: 18, borderRadius: 8, border: `1.5px solid ${colors.accent}` }}
            />
            <GlassButton
              onClick={() => setSteps(steps === MIN_STEPS ? MAX_STEPS : MIN_STEPS)}
              style={{ fontSize: 16, padding: '6px 24px', background: colors.button, color: colors.buttonText, border: `1.5px solid ${colors.accent}` }}
            >
              {steps === MIN_STEPS ? 'Dobrar Loop (16)' : 'Reduzir Loop (8)'}
            </GlassButton>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
              <label htmlFor="volume-slider" style={{ fontWeight: 'bold', color: colors.fg }}>Volume:</label>
              <GlassSlider
                id="volume-slider"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                style={{ width: 120 }}
              />
              <span style={{ minWidth: 32, display: 'inline-block', textAlign: 'right', color: colors.fg }}>{Math.round(volume * 100)}%</span>
            </div>
          </div>
          <div style={{ marginBottom: 12, fontSize: 15, color: colors.fg, textAlign: 'center', letterSpacing: 1 }}>
            <b>Teclas rápidas:</b> Q (Bumbo), W (Caixa), X (Borda), E (Chimbal), A (Chimbal Aberto), S (Chimbal Meio), R (Tom1), T (Tom2), Y (Surdo), U (Crash), I (Ride)
          </div>
        </GlassCard>
        <GlassCard style={{ background: colors.glass, border: `2px solid ${colors.border}` }}>
          <div style={{ display: 'flex', gap: 18, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {DRUMS.map((drum, idx) => (
              <GlassButton
                key={drum.name}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  background: grid[idx][currentStep] ? colors.accent : colors.button,
                  color: grid[idx][currentStep] ? '#fff' : colors.buttonText,
                  fontWeight: 'bold',
                  border: `2.5px solid ${colors.border}`,
                  boxShadow: grid[idx][currentStep] ? `0 0 16px ${colors.accent}` : colors.padShadow,
                  outline: isPlaying && currentStep === idx ? `3px solid #ff0` : 'none',
                  fontSize: 16,
                  transition: 'background 0.2s, color 0.2s, border 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={() => handleDrumClick(idx)}
              >
                {drum.label}
              </GlassButton>
            ))}
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 18, background: 'rgba(0,0,0,0.10)', padding: 8 }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
              <thead>
                <tr>
                  <th></th>
                  {Array.from({ length: steps }).map((_, i) => (
                    <th key={i} style={{ width: 32, textAlign: 'center', color: colors.fg }}>{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DRUMS.map((drum, dIdx) => (
                  <tr key={drum.name}>
                    <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: 8, color: colors.fg }}>{drum.label}</td>
                    {Array.from({ length: steps }).map((_, sIdx) => (
                      <td
                        key={sIdx}
                        style={{
                          background: grid[dIdx][sIdx] ? colors.padOn : colors.padOff,
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 8,
                          width: 32,
                          height: 32,
                          opacity: currentStep === sIdx && isPlaying ? 1 : 0.8,
                          cursor: 'pointer',
                          boxShadow: grid[dIdx][sIdx] ? `0 0 8px ${colors.accent}` : 'none',
                          transition: 'background 0.2s, border 0.2s',
                        }}
                        onClick={() => {
                          setGrid((prev) => {
                            const copy = prev.map((row) => [...row]);
                            copy[dIdx][sIdx] = !copy[dIdx][sIdx];
                            return copy;
                          });
                          playDrum(dIdx);
                        }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
        <GlassCard style={{ background: colors.glass, border: `2px solid ${colors.border}` }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
            <GlassButton onClick={handlePlay} style={{ fontSize: 18, minWidth: 120, background: colors.button, color: colors.buttonText, border: `2px solid ${colors.accent}` }}>
              {isPlaying ? 'Parar' : 'Play/Rec'}
            </GlassButton>
            <GlassButton onClick={handleSearch} style={{ fontSize: 18, minWidth: 120, background: colors.accent, color: '#fff', border: `2px solid ${colors.accent}` }} disabled={loading}>
              Buscar Similaridade
            </GlassButton>
            <GlassButton onClick={handleExport} style={{ fontSize: 18, minWidth: 120, background: '#f90', color: '#fff', border: `2px solid #f90` }} disabled={loading}>
              Exportar MIDI
            </GlassButton>
            <label style={{ fontSize: 18, minWidth: 120, background: colors.accent, color: '#fff', borderRadius: 16, cursor: 'pointer', display: 'inline-block', border: `2px solid ${colors.accent}`, padding: '10px 32px', fontWeight: 700, boxShadow: '0 2px 8px #0002' }}>
              Upload MIDI
              <input type="file" accept=".mid,.midi" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
            <GlassButton onClick={handleClear} style={{ fontSize: 18, minWidth: 120, background: colors.border, color: colors.buttonText, border: `2px solid ${colors.border}` }} disabled={loading}>
              Limpar Loop
            </GlassButton>
          </div>
          {importedRhythm && (
            <div style={{ marginTop: 8, color: colors.accent, fontWeight: 'bold', textAlign: 'center' }}>
              Arquivo MIDI importado será usado na busca de similaridade.
            </div>
          )}
          {loading && <p style={{ color: colors.fg, textAlign: 'center' }}>Buscando...</p>}
          {error && <p style={{ color: colors.error, textAlign: 'center' }}>{error}</p>}
        </GlassCard>
        {results.length > 0 && (
          <GlassCard style={{ background: colors.glass, border: `2px solid ${colors.accent}` }}>
            <h3 style={{ color: colors.fg, textAlign: 'center', marginBottom: 16 }}>Resultados de Similaridade</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%', background: 'rgba(0,0,0,0.10)', color: colors.fg, borderRadius: 12 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Arquivo</th>
                  <th>Distância</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.filename}</td>
                    <td>{r.distance.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )}
      </div>
    </div>
  );
// ...apenas layout moderno permanece...
}
