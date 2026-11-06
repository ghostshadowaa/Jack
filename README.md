# Jack Capture

Aplicação independente com interface mobile inspirada em feeds de vídeos curtos. Não é afiliada ao TikTok.

## O que faz
- Solicita consentimento informado antes de habilitar a câmera frontal.
- Mostra uma prévia; não fotografa automaticamente.
- A pessoa toca em **Fotografar** e depois em **Confirmar e enviar**.
- No envio, o backend registra o IP público recebido pelo servidor e salva a imagem em um bucket privado do Supabase.
- Não há endpoint público para listar ou baixar capturas.

## Configuração do Supabase
1. Crie um projeto Supabase.
2. Em Storage, crie o bucket privado `jack-captures`.
3. Execute `supabase/schema.sql` no SQL Editor.
4. Copie a URL do projeto e a chave **service_role** para as variáveis secretas do Render. Nunca publique essa chave.

## Deploy no Render
Crie um Web Service apontando para este repositório. O arquivo `render.yaml` define o serviço e as variáveis necessárias:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` (padrão: `jack-captures`)

O endpoint `/health` informa se o armazenamento está configurado, sem revelar segredos.

## Desenvolvimento local
```bash
pip install -r requirements.txt
export SUPABASE_URL="https://SEU-PROJETO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="SUA_CHAVE_SERVICE_ROLE"
python app.py
```

A câmera exige HTTPS (ou localhost) e depende da permissão explícita do navegador.

## Privacidade
O visitante vê previamente quais dados são enviados. A imagem e o IP só são transmitidos após marcar o consentimento, capturar a foto e confirmar o envio. Armazene a chave de serviço somente no ambiente do servidor. Defina um prazo de retenção e um processo para atender solicitações de exclusão.
