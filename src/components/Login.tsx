import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useTenantStore } from '../store/useTenantStore'
import { User, Lock, Loader2 } from 'lucide-react'
import Emblema from '../assets/Emblema.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const setRole = useTenantStore((state) => state.setRole)
  const setTenant = useTenantStore((state) => state.setTenant)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
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
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, tenants(*)')
        .eq('user_id', data.user.id)
        .single()

      if (roleData) {
        setRole(roleData.role)
        if (roleData.tenants) {
          setTenant(roleData.tenants as any)
        }
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      
      <div className="w-full max-w-md space-y-8 bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-800 relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={Emblema} 
              alt="LogisCore" 
              className="w-16 h-16 rounded-xl shadow-lg"
            />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">LogisCore</h2>
          <p className="mt-2 text-slate-400">Accede a tu panel administrativo</p>
        </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
              Recordarme
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-blue-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Iniciando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
