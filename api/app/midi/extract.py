import pretty_midi
import numpy as np
from typing import BinaryIO, List

# Extrai um vetor rítmico simples (histograma de onsets por divisão fixa)
def extract_rhythm_vector(file: BinaryIO, vector_size: int = 32) -> List[float]:
    midi = pretty_midi.PrettyMIDI(file)
    # Pega todos os onsets de todas as notas
    onsets = []
    for instrument in midi.instruments:
        for note in instrument.notes:
            onsets.append(note.start)
    if not onsets:
        return [0.0] * vector_size
    # Normaliza os onsets para o range [0, 1]
    onsets = np.array(onsets)
    onsets = (onsets - onsets.min()) / (onsets.max() - onsets.min() + 1e-9)
    # Histograma dos onsets
    hist, _ = np.histogram(onsets, bins=vector_size, range=(0, 1))
    # Normaliza o vetor
    rhythm_vector = hist.astype(float) / (hist.sum() + 1e-9)
    return rhythm_vector.tolist()
