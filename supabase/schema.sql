-- Execute no SQL Editor do Supabase.
-- Crie também um bucket PRIVADO chamado jack-captures no Storage.
create table if not exists public.captures (
  id uuid primary key,
  ip_address inet not null,
  object_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.captures enable row level security;

-- Não crie políticas públicas de leitura ou escrita.
-- O backend usa a service role key, guardada somente nas variáveis
-- de ambiente do Render. Nunca coloque essa chave no frontend/GitHub.
