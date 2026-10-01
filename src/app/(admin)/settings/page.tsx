export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
      </div>
      <div className="page-body">
        <div className="alert alert-info">
          <span className="alert-icon">ℹ️</span>
          <div>
            <strong>Variáveis de ambiente necessárias:</strong><br />
            Configure as seguintes variáveis no painel da Vercel ou no arquivo .env.local:
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔒 Segurança</h2>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Variável</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Descrição</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Obrigatória</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['NEXT_PUBLIC_SUPABASE_URL', 'URL do projeto Supabase', 'Sim'],
                ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Chave anon do Supabase (não privilegiada)', 'Sim'],
                ['SUPABASE_SERVICE_ROLE_KEY', 'Chave service role do Supabase (somente servidor)', 'Sim'],
                ['ENCRYPTION_KEY', '32 bytes hex (64 chars) para AES-256-GCM. Gere com: openssl rand -hex 32', 'Sim'],
                ['ADMIN_SECRET', 'Senha de acesso ao painel. Qualquer string segura.', 'Sim'],
                ['CRON_SECRET', 'Token para proteger o endpoint do cron job', 'Sim'],
              ].map(([name, desc, req]) => (
                <tr key={name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 0', fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-secondary)', paddingRight: 24 }}>{name}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, color: 'var(--text-secondary)', paddingRight: 24 }}>{desc}</td>
                  <td style={{ padding: '10px 0', fontSize: 12 }}>
                    <span className={`badge ${req === 'Sim' ? 'badge-error' : 'badge-queued'}`}>{req}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>⚙️ Cron Job</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            O processamento da fila ocorre a cada minuto via Vercel Cron Jobs.
            Configure <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>CRON_SECRET</code> no painel da Vercel
            e adicione-a também nas variáveis de ambiente do cron.
          </p>
          <div className="code-block">{`# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "* * * * *"
    }
  ]
}`}</div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔑 Gerar ENCRYPTION_KEY</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Execute o comando abaixo no terminal e use o resultado como valor da variável ENCRYPTION_KEY:
          </p>
          <div className="code-block">openssl rand -hex 32</div>
          <div className="alert alert-warning" style={{ marginTop: 12 }}>
            <span className="alert-icon">⚠️</span>
            Guarde esta chave em local seguro. Se for perdida, não será possível descriptografar as credenciais armazenadas.
          </div>
        </div>
      </div>
    </>
  );
}
