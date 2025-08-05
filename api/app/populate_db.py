import os
from app.db import SessionLocal
from app.models import MidiFile
import pretty_midi

def extract_rhythm_vector(midi_path, steps=16):
    midi = pretty_midi.PrettyMIDI(midi_path)
    # Exemplo: histograma simples de onsets por step (ajuste conforme seu modelo)
    total_time = midi.get_end_time()
    vector = [0] * steps
    for inst in midi.instruments:
        for note in inst.notes:
            step = int((note.start / total_time) * steps)
            if 0 <= step < steps:
                vector[step] += 1
    max_v = max(vector) or 1
    return [v / max_v for v in vector]

def extract_bpm(midi_path):
    midi = pretty_midi.PrettyMIDI(midi_path)
    if midi.get_tempo_changes()[1].size > 0:
        return float(midi.get_tempo_changes()[1][0])
    return 120.0

def populate_from_folder(root_folder):
    db = SessionLocal()
    for dirpath, _, filenames in os.walk(root_folder):
        for fname in filenames:
            if fname.lower().endswith(('.mid', '.midi')):
                fpath = os.path.join(dirpath, fname)
                try:
                    rhythm_vector = extract_rhythm_vector(fpath)
                    bpm = extract_bpm(fpath)
                    with open(fpath, 'rb') as f:
                        midi_bytes = f.read()
                    midi_file = MidiFile(
                        filename=fname,
                        rhythm_vector=rhythm_vector,
                        bpm=bpm,
                        data=midi_bytes
                    )
                    db.add(midi_file)
                    print(f'Adicionado: {fname}')
                except Exception as e:
                    print(f'Erro em {fname}: {e}')
    db.commit()
    db.close()

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Uso: python populate_db.py <pasta>')
    else:
        populate_from_folder(sys.argv[1])
