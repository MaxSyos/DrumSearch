# 🎵 Rhythm MIDI Search - FastAPI + Next.js

## DRUM SEARCH

Sistema de **busca por similaridade rítmica** em arquivos MIDI, com frontend em Next.js e backend Python/FastAPI. Utiliza PostgreSQL com extensão `pgvector` para buscas vetoriais de padrões rítmicos.

---

## Arquitetura

### Backend - FastAPI (Python)

1. **UploadModule**
   - Envio de arquivos MIDI
   - Extração de vetores rítmicos
   - Armazenamento local/S3

2. **SearchModule**
   - Busca vetorial por similaridade rítmica
   - Modo estrito (compasso/tempo fixo) e livre (padrões globais)
   - Ordenação por distância vetorial (L2)

3. **MidiModule**
   - Análise de compasso, BPM, duração e eventos MIDI
   - Normalização rítmica
   - Suporte a múltiplos formatos e resoluções

4. **VectorModule**
   - Geração e manipulação de vetores rítmicos
   - Integração com pgvector e FAISS (opcional)
   - Fallback de similaridade com DTW/Hamming

---

### Frontend - Next.js (TypeScript)

1. **UploadPage**
   - Interface para envio de arquivos MIDI
   - Exibição de metadados extraídos
   - Validação de formato e preview

2. **SearchPage**
   - Busca por batidas similares (upload ou escolha prévia)
   - Visualização dos resultados com distância rítmica
   - Playback MIDI e comparativo visual

3. **ResultPage**
   - Detalhamento dos arquivos encontrados
   - Compasso, BPM, vetor rítmico e análise visual

---

### Banco de Dados

1. **PostgreSQL + pgvector**
   - Armazena:
     - Arquivos MIDI
     - Vetores rítmicos
     - Metadados musicais (BPM, compasso, duração)
   - Busca vetorial com operadores:
     - `<=>` (distância Euclidiana)
     - `<#>` (distância Cosine)

2. **Estrutura da Tabela**

| Campo           | Tipo         |
|-----------------|--------------|
| id              | UUID         |
| filename        | TEXT         |
| bpm             | FLOAT        |
| time_signature  | TEXT         |
| duration        | FLOAT        |
| rhythm_vector   | VECTOR(32)   |
| created_at      | TIMESTAMP    |

---

### Dockerização

1. **Serviços**
   - `api`: Backend FastAPI
   - `web`: Frontend Next.js
   - `db`: PostgreSQL com pgvector
   - `pgadmin`: Interface web para gerenciar o banco (opcional)

2. **Docker Compose**
   - Ambiente completo com todos os serviços integrados
   - Hot reload para desenvolvimento local

---

## Segurança

1. **Proteções no Backend**
   - Validação de entrada com Pydantic
   - Limite de tamanho de arquivos
   - CORS configurado por ambiente
   - Filtros anti-injeção em queries

2. **Frontend**
   - Sanitização de inputs
   - Verificação MIME dos uploads
   - Headers de segurança com Next.js

---

## Integração

1. **API RESTful**
   - Documentação OpenAPI automática (`/docs`)
   - Upload e busca de arquivos
   - Respostas estruturadas com status HTTP

2. **WebSocket (futuro)**
   - Progresso de upload
   - Resultados de busca em tempo real

---

## Setup do Ambiente

### Requisitos

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ com extensão `pgvector`
- Docker + Docker Compose

---

### Variáveis de Ambiente

#### `.env.api`
```env
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=mididb

CI/CD (opcional)
Pipeline

Lint + Testes no backend e frontend

Build Docker

Deploy automático para Render/Heroku/Vercel

Qualidade

Cobertura mínima de testes: 80%

Segurança em uploads e endpoints

Monitoramento com Prometheus (opcional futuro)
