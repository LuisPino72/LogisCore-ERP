import { useState } from "react";
import { supabase } from "../../../services/supabase";
import { useTenantStore } from "../../../store/useTenantStore";
import { useToast } from "../../../providers/ToastProvider";
import { User, Lock, Loader2, ArrowLeft } from "lucide-react";
import Emblema from "../../../assets/Emblema.ico";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  modules: {
    sales: boolean;
    inventory: boolean;
    purchases: boolean;
    recipes: boolean;
    reports: boolean;
  };
  config?: Record<string, unknown>;
}

interface RoleData {
  role: "super_admin" | "owner" | "employee";
  tenants: TenantData;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const setRole = useTenantStore((state) => state.setRole);
  const setTenant = useTenantStore((state) => state.setTenant);
  const { showError, showSuccess } = useToast();

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showError("Por favor ingresa tu correo electrónico");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      showError("Error al enviar correo: " + error.message);
    } else {
      showSuccess(
        "Correo de recuperación enviado. Revisa tu bandeja de entrada.",
      );
      setRecoverySent(true);
    }

    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showError("Por favor ingresa correo y contraseña");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError("Error al iniciar sesión: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: roleData } = (await supabase
        .from("user_roles")
        .select("role, tenants(*)")
        .eq("user_id", data.user.id)
        .single()) as { data: RoleData | null };

      if (roleData) {
        setRole(roleData.role);
        if (roleData.tenants) {
          setTenant(roleData.tenants);
        }
        showSuccess("¡Bienvenido a LogisCore!");
      } else {
        showError(
          "Tu usuario no tiene un tenant asignado. Contacta al administrador.",
        );
        await supabase.auth.signOut();
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg-primary) relative overflow-hidden transition-colors duration-500">
      {/* Dynamic background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-(--bg-primary) via-(--bg-secondary) to-(--bg-tertiary)" />

      {/* Decorative brand glow - subtle and dynamic */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-(--brand-500)/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-(--brand-secondary-500,var(--brand-500))/5 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* Subtle pattern overlay - simplified and variable controlled */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(var(--text-muted) 0.5px, transparent 0.5px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-md space-y-8 bg-(--bg-secondary)/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-(--border-color) relative z-10 mx-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-(--brand-500)/20 rounded-2xl blur-2xl group-hover:bg-(--brand-500)/30 transition-all duration-500" />
              <img
                src={Emblema}
                alt="LogisCore"
                className="w-20 h-20 rounded-2xl shadow-2xl relative z-10 border border-(--border-color) group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-(--text-primary) font-inter">
            LogisCore
          </h2>
          <p className="mt-2 text-(--text-secondary) font-medium">
            Gestión profesional para tu negocio
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-(--text-secondary) ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--brand-500) transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@logiscore.com"
                  className="block w-full pl-12 pr-4 py-3.5 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-2xl text-(--text-primary) placeholder-(--text-muted) focus:border-(--brand-500) focus:bg-(--bg-tertiary) focus:outline-none focus:ring-4 focus:ring-(--brand-500)/10 transition-all duration-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-(--text-secondary) ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--brand-500) transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-12 pr-4 py-3.5 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-2xl text-(--text-primary) placeholder-(--text-muted) focus:border-(--brand-500) focus:bg-(--bg-tertiary) focus:outline-none focus:ring-4 focus:ring-(--brand-500)/10 transition-all duration-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-4 px-4 bg-linear-to-r from-(--brand-700) to-(--brand-600) hover:from-(--brand-600) hover:to-(--brand-500) text-white text-lg font-bold rounded-2xl shadow-xl shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 transition-all duration-300 hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-3" />
                Verificando...
              </>
            ) : (
              "Entrar al Panel"
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRecoveryMode(true);
                setRecoverySent(false);
              }}
              className="text-sm text-(--text-muted) hover:text-(--brand-500) transition-colors underline underline-offset-4">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>

        {isRecoveryMode && (
          <form className="mt-8 space-y-6" onSubmit={handleRecovery}>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoverySent(false);
                }}
                className="flex items-center gap-2 text-sm text-(--text-muted) hover:text-(--brand-500) transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" />
                Volver al login
              </button>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-(--text-secondary) ml-1">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--brand-500) transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="admin@logiscore.com"
                    className="block w-full pl-12 pr-4 py-3.5 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-2xl text-(--text-primary) placeholder-(--text-muted) focus:border-(--brand-500) focus:bg-(--bg-tertiary) focus:outline-none focus:ring-4 focus:ring-(--brand-500)/10 transition-all duration-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {recoverySent ? (
              <div className="text-center py-4">
                <p className="text-(--brand-400) text-sm">
                  Se ha enviado un correo de recuperación a{" "}
                  <strong>{email}</strong>
                </p>
                <p className="text-(--text-muted) text-xs mt-2">
                  Revisa tu bandeja de entrada y sigue las instrucciones.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-4 bg-linear-to-r from-(--brand-700) to-(--brand-600) hover:from-(--brand-600) hover:to-(--brand-500) text-white text-lg font-bold rounded-2xl shadow-xl shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 transition-all duration-300 hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-3" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Correo de Recuperación"
                )}
              </button>
            )}
          </form>
        )}

        <div className="text-center pt-4 border-t border-(--border-color)">
          <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest bg-clip-text">
            LogisCore ERP Solution
          </p>
        </div>
      </div>
    </div>
  );
}
