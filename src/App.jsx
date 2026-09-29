import { supabaseConfigured } from './supabase.js'

export default function App() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">DASHBOARD SM</p>
        <h1>Estrutura inicial conectada.</h1>
        <p>GitHub, Cloudflare e Supabase estão prontos para receber o dashboard.</p>
        <div className={supabaseConfigured ? 'status ok' : 'status pending'}>
          <span />
          {supabaseConfigured ? 'Supabase configurado' : 'Variáveis do Supabase pendentes no ambiente'}
        </div>
      </section>
    </main>
  )
}
