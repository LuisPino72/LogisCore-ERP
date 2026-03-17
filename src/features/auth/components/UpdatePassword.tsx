import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../providers/ToastProvider";
import { Lock, Loader2, Check, ArrowLeft } from "lucide-react";
import Emblema from "../../../assets/Emblema.ico";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (!accessToken || type !== "recovery") {
          setError("Enlace de recuperación inválido o expirado");
        }
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Por favor ingresa una contraseña");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      showError("Error al actualizar contraseña");
    } else {
      setSuccess(true);
      showSuccess("Contraseña actualizada correctamente");
    }

    setLoading(false);
  };

  const handleGoToLogin = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg-primary) relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-linear-to-br from-(--bg-primary) via-(--bg-secondary) to-(--bg-tertiary)" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-(--brand-500)/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-(--brand-secondary-500,var(--brand-500))/5 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{ animationDelay: "1s" }}
      />
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
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-(--text-secondary) font-medium">
            Ingresa tu nueva contraseña
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <p className="text-(--text-primary) font-medium">
              Tu contraseña ha sido actualizada correctamente
            </p>
            <button
              onClick={handleGoToLogin}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-linear-to-r from-(--brand-700) to-(--brand-600) hover:from-(--brand-600) hover:to-(--brand-500) text-white text-lg font-bold rounded-2xl shadow-xl shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 transition-all duration-300 hover:scale-[0.98] active:scale-95">
              <ArrowLeft className="w-5 h-5" />
              Volver al Login
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-(--text-secondary) ml-1">
                  Nueva Contraseña
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

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-(--text-secondary) ml-1">
                  Confirmar Contraseña
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Actualizando...
                </>
              ) : (
                "Actualizar Contraseña"
              )}
            </button>
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
