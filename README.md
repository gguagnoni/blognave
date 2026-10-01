# BlogNave 🚀

BlogNave é um SaaS interno (para operador único) projetado para administrar dezenas de sites WordPress pertencentes a diferentes clientes. Ele permite a geração em massa e automatizada de artigos utilizando múltiplos provedores de Inteligência Artificial (OpenAI, Anthropic, Gemini, DeepSeek, etc.) e o agendamento de publicações diretamente via WordPress REST API.

---

## 🌟 Principais Recursos

- **Conexão de Múltiplos Sites WP:** Gerencie diversos sites clientes. Sincroniza Categorias e Autores automaticamente. Usa Application Passwords de forma segura.
- **Múltiplos Provedores de IA:** Conecte contas de diferentes provedores (OpenAI, Anthropic Claude, Google Gemini, DeepSeek e APIs customizadas compatíveis com OpenAI).
- **Pipeline de Conteúdo Completo:** 
  - Geração de texto altamente customizável (Briefing, Palavras-chave, Tom de voz).
  - Link building automático e Fontes Externas restritas.
  - Geração de imagens via IA (destacada e corpo do artigo) com integração direta de mídia no WP.
- **Esteira de Aprovação:** Status como `queued`, `generating_text`, `generating_images`, `needs_review`, `scheduled` e `published`.
- **Worker em Background (Cron):** Processamento assíncrono para lidar com limites de APIs, timeouts e falhas transitórias (retry automático).
- **Segurança de Nível Corporativo:** As credenciais e tokens de API dos usuários são criptografadas (AES-256-GCM) no banco de dados.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend:** Next.js 15 (App Router, Server Components) + TypeScript
- **Banco de Dados:** Supabase (PostgreSQL) com RLS ativado (acesso negado a anônimos).
- **Design:** CSS Modules / CSS Variables customizado (Modern UI, Glassmorphism).
- **Deploy Recomendado:** Vercel

---

## 🔒 Variáveis de Ambiente Necessárias

Para rodar este projeto (tanto local quanto na Vercel), você precisará criar um arquivo `.env.local` na raiz com as seguintes variáveis:

```env
# Conexão com o Supabase (encontrado no painel do Supabase -> API Settings)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."

# Service Role Key (IMPORTANTE: Nunca expor ao navegador. Usada pelo servidor para bypass do RLS)
SUPABASE_SERVICE_ROLE_KEY="eyJhb..."

# Chave Criptográfica AES-256-GCM
# (Gere com: openssl rand -hex 32)
# Deve ter exatamente 64 caracteres hexadecimais (32 bytes).
ENCRYPTION_KEY="sua_chave_hex_aqui..."

# Segurança do Painel
# Senha global para acessar o painel administrativo (já que não há login multipart)
ADMIN_SECRET="sua_senha_super_secreta"

# Segurança do Cron
# Usado para proteger a rota /api/cron/process-queue contra disparos indevidos
CRON_SECRET="seu_token_cron"
```

---

## 🚀 Como fazer o Deploy na Vercel

1. **Suba este código para o seu GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/gguagnoni/blognave.git
   git push -u origin main
   ```

2. **Crie o projeto na Vercel:**
   - Acesse [Vercel](https://vercel.com/) e faça login.
   - Clique em **Add New Project** e importe o repositório `blognave`.
   - Na etapa de **Environment Variables**, adicione todas as chaves listadas acima.
   - Clique em **Deploy**.

3. **Configuração do Cron Job:**
   - O projeto possui um `vercel.json` na raiz instruindo a execução do Cron.
   - Na Vercel, acesse **Settings > Cron Jobs** para validar se a rota `/api/cron/process-queue` está agendada corretamente.
   - Certifique-se de que a variável `CRON_SECRET` foi adicionada lá, se necessário.

4. **Proteger o Projeto (Vercel Password Protection):**
   - O projeto já usa a variável `ADMIN_SECRET` para proteger via Middleware, mas para uma proteção a nível de rede, recomenda-se habilitar o "Vercel Password Protection" ou o "Vercel Authentication" nas configurações de Deployment da Vercel.

---

## 🧪 Testando Localmente

1. Instale as dependências:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Configure o arquivo `.env.local` (conforme tabela acima).

3. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse `http://localhost:3000`. Você verá a tela de login. Digite a senha definida no `ADMIN_SECRET` para entrar no painel.

---

## 💡 Como Usar o Sistema

1. **Adicionar Site WordPress:** No painel, vá em "Sites". Crie uma "Application Password" no painel do seu WordPress e use-a para conectar o site. Use o botão "Sincronizar" para puxar as categorias.
2. **Configurar IA:** Vá em "Provedores". Adicione sua chave da OpenAI ou Anthropic, e teste a conexão.
3. **Criar Artigo:** Vá em "Esteira de Artigos" e clique em "Novo Artigo". Preencha o briefing.
4. O artigo cairá na fila (`Na Fila`). O cron de background tentará gerar o texto e as imagens.
5. Quando o status mudar para `Aguardando Revisão`, você poderá ler, editar os textos, e clicar em **Aprovar e Publicar** para o artigo ir diretamente ao ar no seu WordPress!
