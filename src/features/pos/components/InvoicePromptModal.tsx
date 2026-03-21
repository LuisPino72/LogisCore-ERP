import Button from "@/common/Button";
import { FileText } from "lucide-react";

interface InvoicePromptModalProps {
  isOpen: boolean;
  onDecline: () => void;
  onGenerate: () => void;
}

export default function InvoicePromptModal({ isOpen, onDecline, onGenerate }: InvoicePromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 text-center space-y-4">
          <FileText className="w-12 h-12 mx-auto text-blue-400" />
          <h3 className="text-lg font-semibold text-(--text-primary)">¿Desea generar una factura?</h3>
          <p className="text-sm text-(--text-secondary)">
            La venta se completó exitosamente. ¿Desea generar la factura fiscal?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onDecline} className="flex-1">
              No, gracias
            </Button>
            <Button onClick={onGenerate} className="flex-1">
              Generar Factura
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
