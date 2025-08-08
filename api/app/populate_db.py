
import os
import tempfile
import zipfile
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
    added = 0
    errors = []
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
                    added += 1
                except Exception as e:
                    errors.append(f'Erro em {fname}: {e}')
    db.commit()
    db.close()
    return added, errors

# Função principal para processar arquivo zipado


# Função principal para processar arquivo zipado
def populate_from_zip(zip_path):
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(tmpdir)
        except Exception as e:
            return 0, [f'Erro ao descompactar: {e}']
        return populate_from_folder(tmpdir)

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Uso: python populate_db.py <pasta_ou_zip>')
    else:
        path = sys.argv[1]
        if path.lower().endswith('.zip'):
            added, errors = populate_from_zip(path)
        else:
            added, errors = populate_from_folder(path)
        print(f'Arquivos adicionados: {added}')
        if errors:
            print('Ocorreram erros:')
            for err in errors:
                print(err)
