-- ==============================================================================
-- SCRIPTURA — ESQUEMA DO BANCO DE DADOS SUPABASE (POSTGRESQL COM RLS)
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com).
-- 2. Vá em 'SQL Editor' no menu lateral esquerdo.
-- 3. Clique em 'New Query', cole todo este arquivo e clique em 'Run'.
-- ==============================================================================

-- 1. TABELA DE SINCRONIZAÇÃO GERAL DO USUÁRIO
-- Guarda de forma rápida e atômica o marcador atual, destaques, sequência e preferências.
CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bookmark JSONB,
  highlights JSONB DEFAULT '{}'::jsonb,
  streak JSONB,
  font_size INTEGER DEFAULT 19,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita Row Level Security (RLS) obrigatória
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: O usuário só tem permissão para ler, inserir e atualizar seus próprios dados
DROP POLICY IF EXISTS "Usuário gerencia seus próprios dados de sincronização" ON public.user_sync;
CREATE POLICY "Usuário gerencia seus próprios dados de sincronização"
  ON public.user_sync
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. TABELA RELACIONAL DE DESTAQUES (OPCIONAL/GRANULAR)
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_key TEXT NOT NULL, -- Ex: 'jo_3_16'
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, verse_key)
);

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia seus próprios destaques" ON public.highlights;
CREATE POLICY "Usuário gerencia seus próprios destaques"
  ON public.highlights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. TABELA DE PROGRESSO DE LEITURA (CAPÍTULOS LIDOS)
CREATE TABLE IF NOT EXISTS public.reading_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, book, chapter)
);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia seu próprio progresso de leitura" ON public.reading_progress;
CREATE POLICY "Usuário gerencia seu próprio progresso de leitura"
  ON public.reading_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 4. FUNÇÃO DE EXCLUSÃO DEFINITIVA DE CONTA (CONFORMIDADE LGPD)
-- Permite que o próprio usuário autenticado exclua sua conta e todos os dados associados
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove os registros do usuário (o ON DELETE CASCADE já limpa as tabelas filhas)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Garante que apenas usuários autenticados possam invocar a exclusão de sua própria conta
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
