import { AlertTriangle, Settings } from "lucide-react";
import Card from "@/common/Card";

interface DisabledStateBannerProps {
  onOpenSettings?: () => void;
}

export default function DisabledStateBanner({ onOpenSettings }: DisabledStateBannerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar facturas y documentos fiscales">
            Facturación
          </h2>
          <p className="text-slate-400">Gestión de facturas digitales</p>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Configurar datos fiscales"
            className="flex items-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurar
          </button>
        )}
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Módulo de Facturación No Configurado
          </h3>
          <p className="text-slate-400 max-w-md mb-6">
            Para comenzar a generar facturas digitales válidas, necesitas configurar primero 
            los datos fiscales de tu empresa según la normativa SENIAT.
          </p>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-6 py-3 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors shadow-lg shadow-(--brand-500)/20"
            >
              <Settings className="w-5 h-5" />
              Configurar Datos Fiscales
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
