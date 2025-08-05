import React, { useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { Midi } from '@tonejs/midi';
// Mapeamento EZdrummer (Toontrack) para grid/playback
const EZDRUMMER_NOTES = [
  36, // Kick
  38, // Snare
  42, // HiHat (Fechado)
  46, // Open HiHat
  23, // Mid HiHat (A#0)
  50, // Tom1
  47, // Tom2
  43, // FloorTom
  49, // Crash
  51, // Ride
];

// Mapeamento Cakewalk/GM para exportação
const CAKEWALK_NOTES = [
  36, // Kick
  38, // Snare
  42, // HiHat (Fechado)
  46, // Open HiHat
  44, // Mid HiHat (G#1)
  48, // Tom1
  47, // Tom2
  43, // FloorTom
  49, // Crash
  51, // Ride
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
        // Converte EZdrummer para Cakewalk/GM na exportação
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
    e: 2, // HiHat
    a: 3, // OpenHiHat
    s: 4, // MidHiHat
    r: 5, // Tom1
    t: 6, // Tom2
    y: 7, // FloorTom
    u: 8, // Crash
    i: 9, // Ride
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h2>Drum Machine</h2>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => setMetronomeOn((on) => !on)}
          title={metronomeOn ? 'Desligar Metrônomo' : 'Ligar Metrônomo'}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: metronomeOn ? '#0c0' : '#888',
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            fontSize: 16,
            marginRight: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: metronomeOn ? '0 0 4px #0c0' : 'none',
          }}
        >
          <span role="img" aria-label="Metrônomo">{metronomeOn ? '🔊' : '🔇'}</span>
        </button>
        <label htmlFor="bpm-input" style={{ fontWeight: 'bold', marginRight: 8 }}>BPM:</label>
        <input
          id="bpm-input"
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          style={{ width: 80, fontSize: 18, padding: 4, borderRadius: 4, border: '1px solid #888' }}
        />
        <button
          onClick={() => setSteps(steps === MIN_STEPS ? MAX_STEPS : MIN_STEPS)}
          style={{ fontSize: 16, padding: '4px 16px', background: '#444', color: '#fff', borderRadius: 4, border: 'none' }}
        >
          {steps === MIN_STEPS ? 'Dobrar Loop (16)' : 'Reduzir Loop (8)'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
          <label htmlFor="volume-slider" style={{ fontWeight: 'bold' }}>Volume:</label>
          <input
            id="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ minWidth: 32, display: 'inline-block', textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 14, color: '#555' }}>
        <b>Teclas rápidas:</b> Q (Bumbo), W (Caixa), E (Chimbal), A (Chimbal Aberto), S (Chimbal Meio), R (Tom1), T (Tom2), Y (Surdo), U (Crash), I (Ride)
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {DRUMS.map((drum, idx) => (
          <button
            key={drum.name}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#c00',
              color: '#fff',
              fontWeight: 'bold',
              border: '2px solid #333',
              boxShadow: '2px 2px 8px #0004',
              outline: currentStep === idx ? '3px solid #ff0' : 'none',
            }}
            onClick={() => handleDrumClick(idx)}
          >
            {drum.label}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th></th>
              {Array.from({ length: steps }).map((_, i) => (
                <th key={i} style={{ width: 32, textAlign: 'center' }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DRUMS.map((drum, dIdx) => (
              <tr key={drum.name}>
                <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: 8 }}>{drum.label}</td>
                {Array.from({ length: steps }).map((_, sIdx) => (
                  <td
                    key={sIdx}
                    style={{
                      background: grid[dIdx][sIdx] ? '#0c0' : '#222',
                      border: '1px solid #555',
                      width: 32,
                      height: 32,
                      opacity: currentStep === sIdx && isPlaying ? 1 : 0.7,
                      cursor: 'pointer',
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
      <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
        <button onClick={handlePlay} style={{ fontSize: 18, padding: '8px 32px' }}>
          {isPlaying ? 'Parar' : 'Play/Rec'}
        </button>
        <button onClick={handleSearch} style={{ fontSize: 18, padding: '8px 32px', background: '#06c', color: '#fff' }} disabled={loading}>
          Buscar Similaridade
        </button>
        <button onClick={handleExport} style={{ fontSize: 18, padding: '8px 32px', background: '#f90', color: '#fff' }} disabled={loading}>
          Exportar MIDI
        </button>
        <label style={{ fontSize: 18, padding: '8px 32px', background: '#090', color: '#fff', borderRadius: 4, cursor: 'pointer', display: 'inline-block' }}>
          Upload MIDI
          <input type="file" accept=".mid,.midi" style={{ display: 'none' }} onChange={handleUpload} />
        </label>
        <button onClick={handleClear} style={{ fontSize: 18, padding: '8px 32px', background: '#888', color: '#fff' }} disabled={loading}>
          Limpar Loop
        </button>
      </div>
      {importedRhythm && (
        <div style={{ marginTop: 8, color: '#090', fontWeight: 'bold' }}>
          Arquivo MIDI importado será usado na busca de similaridade.
        </div>
      )}
      {loading && <p>Buscando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3>Resultados de Similaridade</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
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
        </div>
      )}
    </div>
  );
}
