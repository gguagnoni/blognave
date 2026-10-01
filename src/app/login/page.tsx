'use client';
import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });

    if (res.ok) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } else {
      setError('Código de acesso incorreto.');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 64, height: 64,
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px',
            boxShadow: 'var(--shadow-glow)',
          }}>🚀</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>BlogNave</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Acesso restrito ao operador autorizado</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>
                <span className="alert-icon">⚠️</span>
                {error}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="secret" className="form-label">Código de acesso</label>
              <input
                id="secret"
                type="password"
                className="form-input"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Digite o código de acesso"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8, padding: '12px' }}
              disabled={loading || !secret}
            >
              {loading ? 'Verificando...' : 'Acessar painel'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Apenas o operador autorizado pode acessar este painel.
        </p>
      </div>
    </div>
  );
}
