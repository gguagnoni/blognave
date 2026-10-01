'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    section: 'Principal',
    items: [
      { href: '/', label: 'Visão Geral', icon: '📊' },
      { href: '/articles', label: 'Artigos / Esteira', icon: '📝' },
    ],
  },
  {
    section: 'Configuração',
    items: [
      { href: '/sites', label: 'Sites WordPress', icon: '🌐' },
      { href: '/providers', label: 'Provedores de IA', icon: '🤖' },
      { href: '/settings', label: 'Configurações', icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" role="navigation" aria-label="Navegação principal">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">🚀</div>
        <span className="sidebar-logo-text">BlogNave</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="nav-section">
            <p className="nav-section-label">{section.section}</p>
            {section.items.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          BlogNave v0.1.0
        </p>
      </div>
    </aside>
  );
}
