import { useState, useEffect } from 'react';
import { useInvoicing } from '../hooks/useInvoicing';
import { useToast } from '@/providers/ToastProvider';
import { 
  Building2, 
  FileText, 
  Save, 
  Loader2,
  X,
  Check,
  Shield,
  Receipt,
  Percent,
  AlertCircle,
  Info,
} from 'lucide-react';
import { IGTF_PERCENTAGE } from '../types/invoicing.types';

interface InvoiceSettingsProps {
  onClose: () => void;
}

export default function InvoiceSettings({ onClose }: InvoiceSettingsProps) {
  const { showError } = useToast();
  const {
    taxpayerInfo,
    invoiceSettings,
    saveTaxpayer,
    updateSettings,
    loadTaxpayerInfo,
    loadSettings,
  } = useInvoicing();

  const [taxpayerForm, setTaxpayerForm] = useState({
    rif: '',
    razonSocial: '',
    direccionFiscal: '',
    numeroProvidencia: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    sequentialType: 'daily' as 'daily' | 'monthly' | 'global',
    igtfEnabled: true,
    igtfPercentage: IGTF_PERCENTAGE,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadTaxpayerInfo();
    loadSettings();
  }, [loadTaxpayerInfo, loadSettings]);

  useEffect(() => {
    if (taxpayerInfo) {
      setTaxpayerForm({
        rif: taxpayerInfo.rif || '',
        razonSocial: taxpayerInfo.razonSocial || '',
        direccionFiscal: taxpayerInfo.direccionFiscal || '',
        numeroProvidencia: taxpayerInfo.numeroProvidencia || '',
      });
    }
  }, [taxpayerInfo]);

  useEffect(() => {
    if (invoiceSettings) {
      setSettingsForm({
        sequentialType: invoiceSettings.sequentialType || 'daily',
        igtfEnabled: invoiceSettings.igtfEnabled ?? true,
        igtfPercentage: invoiceSettings.igtfPercentage || IGTF_PERCENTAGE,
      });
    }
  }, [invoiceSettings]);

  const handleSaveTaxpayer = async () => {
    if (!taxpayerForm.rif.trim()) {
      showError('El RIF es requerido');
      return;
    }
    if (!taxpayerForm.razonSocial.trim()) {
      showError('La razón social es requerida');
      return;
    }
    if (!taxpayerForm.direccionFiscal.trim()) {
      showError('La dirección fiscal es requerida');
      return;
    }

    setSaving(true);
    try {
      const success = await saveTaxpayer({
        localId: taxpayerInfo?.localId || crypto.randomUUID(),
        tenantId: '',
        rif: taxpayerForm.rif.trim().toUpperCase(),
        razonSocial: taxpayerForm.razonSocial.trim(),
        direccionFiscal: taxpayerForm.direccionFiscal.trim(),
        numeroProvidencia: taxpayerForm.numeroProvidencia.trim(),
      });
      
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const success = await updateSettings({
        sequentialType: settingsForm.sequentialType,
        igtfEnabled: settingsForm.igtfEnabled,
        igtfPercentage: settingsForm.igtfPercentage,
      });
      
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-(--brand-400)" />
            Configuración de Facturación
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium">Información importante</p>
                <p className="text-slate-400 mt-1">
                  Los datos fiscales son requeridos por la normativa SENIAT (Providencia 0071/0102). 
                  Asegúrate de ingresar la información correcta ya que será impresa en todas tus facturas.
                </p>
              </div>
            </div>
          </div>

          <section>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-(--brand-400)" />
              Datos Fiscales del Contribuyente
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  RIF del Contribuyente *
                </label>
                <input
                  type="text"
                  value={taxpayerForm.rif}
                  onChange={(e) => setTaxpayerForm({ ...taxpayerForm, rif: e.target.value.toUpperCase() })}
                  placeholder="Ej: J-12345678-9"
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Razón Social *
                </label>
                <input
                  type="text"
                  value={taxpayerForm.razonSocial}
                  onChange={(e) => setTaxpayerForm({ ...taxpayerForm, razonSocial: e.target.value })}
                  placeholder="Ej: Comercial ABC, C.A."
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Dirección Fiscal *
                </label>
                <textarea
                  value={taxpayerForm.direccionFiscal}
                  onChange={(e) => setTaxpayerForm({ ...taxpayerForm, direccionFiscal: e.target.value })}
                  placeholder="Ej: Av. Libertador, Torre Empresarial, Piso 5, Oficina 5-A, Caracas, Distrito Capital"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Número de Providencia SENIAT
                </label>
                <input
                  type="text"
                  value={taxpayerForm.numeroProvidencia}
                  onChange={(e) => setTaxpayerForm({ ...taxpayerForm, numeroProvidencia: e.target.value })}
                  placeholder="Ej: SENIAT-2015-0071"
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Número de autorización de máquinas fiscales (opcional)
                </p>
              </div>

              <button
                onClick={handleSaveTaxpayer}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Guardado
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Datos Fiscales
                  </>
                )}
              </button>
            </div>
          </section>

          <div className="border-t border-slate-700 pt-6">
            <section>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-(--brand-400)" />
                Configuración de Numeración
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">
                    Tipo de Secuencial
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, sequentialType: 'daily' })}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        settingsForm.sequentialType === 'daily'
                          ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)'
                          : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="text-sm font-medium">Diario</p>
                      <p className="text-xs mt-1 opacity-70">Reinicia cada día</p>
                    </button>
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, sequentialType: 'monthly' })}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        settingsForm.sequentialType === 'monthly'
                          ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)'
                          : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="text-sm font-medium">Mensual</p>
                      <p className="text-xs mt-1 opacity-70">Reinicia cada mes</p>
                    </button>
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, sequentialType: 'global' })}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        settingsForm.sequentialType === 'global'
                          ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)'
                          : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="text-sm font-medium">Global</p>
                      <p className="text-xs mt-1 opacity-70">Continuo sin reinicio</p>
                    </button>
                  </div>
                </div>

                {invoiceSettings && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase mb-1">Último número usado</p>
                    <p className="text-white font-mono text-lg">
                      {invoiceSettings.lastControlPrefix || '00'}-{String(invoiceSettings.lastInvoiceNumber || 0).padStart(6, '0')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <section>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                <Percent className="w-4 h-4 text-(--brand-400)" />
                Configuración de Impuestos
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Impuesto IGTF</p>
                      <p className="text-xs text-slate-400">
                        Aplica a pagos en divisas (tasa actual: 3%)
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.igtfEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, igtfEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>

                {settingsForm.igtfEnabled && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-green-400 font-medium">IGTF habilitado</p>
                        <p className="text-slate-400 mt-1">
                          Se calculará automáticamente un {IGTF_PERCENTAGE}% sobre el total de la factura 
                          cuando el cliente pague en divisas (efectivo USD, tarjetas, etc.).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Configuración
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <h5 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Alicuotas de IVA disponibles
              </h5>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-400">16%</p>
                  <p className="text-xs text-slate-400 mt-1">General</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-amber-400">8%</p>
                  <p className="text-xs text-slate-400 mt-1">Reducida</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-slate-400">0%</p>
                  <p className="text-xs text-slate-400 mt-1">Exento</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Las alicuotas se asignan a cada producto en el inventario. 
                Los productos exentos no generan IVA.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-(--border-color) bg-slate-800/30 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
