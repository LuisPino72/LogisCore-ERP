import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { X, Download, Printer, FileText, Share2, Loader2 } from 'lucide-react';
import { InvoicePDF } from './InvoicePDF';
import type { Invoice, TaxpayerInfo } from '@/lib/db';

interface InvoicePreviewProps {
  invoice: Invoice;
  taxpayerInfo: TaxpayerInfo;
  onClose: () => void;
  isOpen: boolean;
}

export function InvoicePreview({ invoice, taxpayerInfo, onClose, isOpen }: InvoicePreviewProps) {
  const [isClient, setIsClient] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!navigator.share || !navigator.canShare) {
      return;
    }

    setGeneratingPdf(true);
    try {
      const blob = await generatePdfBlob();
      const file = new File([blob], `Factura-${invoice.controlNumber}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Factura ${invoice.controlNumber}`,
          text: `Factura de ${invoice.emisorRazonSocial} - Total: Bs. ${invoice.totalFinalBs.toLocaleString('es-VE')}`,
          files: [file],
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const { pdf } = await import('@react-pdf/renderer');
    const doc = <InvoicePDF invoice={invoice} taxpayerInfo={taxpayerInfo} />;
    const blob = await pdf(doc).toBlob();
    return blob;
  };

  const invoiceFilename = `Factura-${invoice.invoiceNumber}-${invoice.controlNumber.replace('-', '')}.pdf`;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vista Previa de Factura</h2>
              <p className="text-sm text-gray-500">
                N° {invoice.invoiceNumber} - Control: {invoice.controlNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="pdf-container">
              {isClient && (
                <PDFDownloadLink
                  document={<InvoicePDF invoice={invoice} taxpayerInfo={taxpayerInfo} />}
                  fileName={invoiceFilename}
                  className="hidden"
                >
                  {({ loading }) => (loading ? 'Generando...' : 'Descargar PDF')}
                </PDFDownloadLink>
              )}
              <div className="pdf-preview bg-white p-8">
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{invoice.emisorRazonSocial}</h1>
                      <p className="text-sm text-gray-600">{invoice.emisorRif}</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">{invoice.emisorDireccion}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-gray-900">FACTURA</h2>
                      <p className="text-sm text-gray-600">N° {invoice.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">Control: {invoice.controlNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Fecha de Emisión</p>
                    <p className="text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString('es-VE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Tasa de Cambio</p>
                    <p className="text-gray-900">Bs. {invoice.tasaBcv.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Estatus</p>
                    <p className={`font-medium ${invoice.estatus === 'EMITIDA' ? 'text-green-600' : 'text-red-600'}`}>
                      {invoice.estatus}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-500 uppercase mb-2">Datos del Cliente</p>
                  <p className="font-semibold text-gray-900">{invoice.clienteNombre}</p>
                  <p className="text-sm text-gray-600">{invoice.clienteRifCedula}</p>
                  {invoice.clienteDireccion && (
                    <p className="text-xs text-gray-500 mt-1">{invoice.clienteDireccion}</p>
                  )}
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cant.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio USD</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">IVA %</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Bs.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-gray-600">{item.codigo || '-'}</td>
                          <td className="px-3 py-2 text-gray-900">{item.descripcion}</td>
                          <td className="px-3 py-2 text-gray-600 text-right">
                            {item.cantidad} {item.unidad}
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-right">
                            ${item.precioUnitarioUsd.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-center">
                            {item.exento ? 'EX' : `${item.alicuotaIva}%`}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-right font-medium">
                            Bs. {item.totalBs.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mb-4">
                  <div className="bg-gray-50 rounded-lg p-4 w-64">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Subtotal USD:</span>
                      <span className="text-gray-900">${invoice.subtotalUsd.toFixed(2)}</span>
                    </div>
                    {invoice.montoExentoBs > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Exento:</span>
                        <span className="text-gray-900">Bs. {invoice.montoExentoBs.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Base Imponible:</span>
                      <span className="text-gray-900">Bs. {invoice.baseImponibleBs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">IVA ({invoice.items.find(i => !i.exento)?.alicuotaIva || 16}%):</span>
                      <span className="text-gray-900">Bs. {invoice.montoIvaBs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">TOTAL Bs:</span>
                      <span className="font-bold text-gray-900">Bs. {invoice.totalBs.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {invoice.aplicaIgtf && invoice.montoIgtfBs && invoice.montoIgtfBs > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      IGTF - Impuesto a las Grandes Transacciones Financieras (3%)
                    </p>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-amber-700">Monto Pagado en Divisas:</span>
                      <span className="text-amber-800">${invoice.subtotalUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-amber-700">IGTF (3%):</span>
                      <span className="text-amber-800">Bs. {invoice.montoIgtfBs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t border-amber-200">
                      <span className="text-amber-800">TOTAL A PAGAR:</span>
                      <span className="text-amber-900">Bs. {invoice.totalFinalBs.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs text-gray-500 text-center leading-relaxed">
                    Esta factura fue emitida de conformidad con la Providencia Administrativa N° {invoice.emisorNumeroProvidencia || '0071'} del 14 de febrero de 2006.
                  </p>
                  {invoice.hashSeguridad && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Hash: {invoice.hashSeguridad}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          {isClient && canShare && (
            <button
              onClick={handleShare}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {generatingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {generatingPdf ? 'Preparando...' : 'Enviar'}
            </button>
          )}
          {isClient && (
            <PDFDownloadLink
              document={<InvoicePDF invoice={invoice} taxpayerInfo={taxpayerInfo} />}
              fileName={invoiceFilename}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {({ loading }) => (
                <>
                  <Download className="w-4 h-4" />
                  {loading ? 'Generando...' : 'Descargar PDF'}
                </>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoicePreview;
