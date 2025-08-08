
import React, { useState } from 'react';
import axios from 'axios';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';

export default function PopulateDbPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
    setSuccess(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo .zip contendo os arquivos MIDI.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = 'https://curly-waddle-qgwvjp4rqp5c9p5q-3000.app.github.dev/api/populate-db';
      const res = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setSuccess(res.data.detail || 'Upload realizado com sucesso!');
      } else {
        setError(res.data.detail || 'Erro ao fazer upload');
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao fazer upload');
    } finally {
      setLoading(false);
    }
  };

  // Paleta glass/retro
  const colors = {
    bg: 'rgba(24,20,32,0.92)',
    fg: '#f8f8f8',
    accent: '#ff2e63',
    glass: 'rgba(40,40,50,0.45)',
    border: '#2e2e3a',
    button: 'rgba(40,40,50,0.45)',
    buttonText: '#fff',
    error: '#ff2e63',
    success: '#00e676',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: `${colors.bg} url('/image/cena-relacionada-a-musica-em-3d.jpg') center center/cover no-repeat fixed`,
        color: colors.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GlassCard style={{ padding: 48, background: colors.glass, border: `2px solid ${colors.accent}`, minWidth: 380, maxWidth: 480 }}>
        <h2 style={{ color: colors.fg, fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 32, letterSpacing: 2, textShadow: '0 2px 12px #000a', marginBottom: 24, textAlign: 'center' }}>
          Popular Banco de Dados
        </h2>
        <div style={{ marginBottom: 24, textAlign: 'center', color: colors.fg }}>
          Faça upload de um arquivo <b>.zip</b> contendo todos os arquivos MIDI de uma pasta para popular o banco de dados.<br/>
          <span style={{ fontSize: 15, color: colors.accent }}>
            (Dica: compacte a pasta com seus arquivos MIDI antes de enviar.)
          </span>
        </div>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          style={{ marginBottom: 18, width: '100%' }}
        />
        <GlassButton
          onClick={handleUpload}
          disabled={loading || !file}
          style={{ width: '100%', fontSize: 18, background: colors.accent, color: '#fff', border: `2px solid ${colors.accent}` }}
        >
          {loading ? 'Enviando...' : 'Enviar ZIP'}
        </GlassButton>
        {error && <div style={{ color: colors.error, marginTop: 18, textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ color: colors.success, marginTop: 18, textAlign: 'center' }}>{success}</div>}
      </GlassCard>
    </div>
  );
}
