import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useTenantStore } from '../store/useTenantStore'

/**
 * Componente de Login Universal.
 * Maneja la autenticación y carga el rol/tenant del usuario en el store global.
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setRole = useTenantStore((state) => state.setRole)
  const setTenant = useTenantStore((state) => state.setTenant)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Autenticación con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Error al iniciar sesión: ' + error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Consultar el rol del usuario en la tabla pública
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, tenants(*)')
        .eq('user_id', data.user.id)
        .single()

      if (roleData) {
        setRole(roleData.role)
        if (roleData.tenants) {
          // El casteo a 'any' previene errores de tipo con la respuesta anidada de Supabase
          setTenant(roleData.tenants as any)
        }
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">LogisCore</h2>
          <p className="mt-2 text-slate-400">Accede a tu panel administrativo</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Correo Electrónico</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Contraseña</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-lg font-semibold"
          >
            {loading ? 'Iniciando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
