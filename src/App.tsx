import { BrowserRouter, Route, Routes } from 'react-router'
import { Providers } from './providers'

function Placeholder() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Issue 管理平台</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Vite + Cloudflare skeleton — 待接后续 route
        </p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<Placeholder />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  )
}
