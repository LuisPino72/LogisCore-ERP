import { useEffect, useCallback, useState, useMemo, lazy, Suspense } from "react";
import { useInvoicing } from "../hooks/useInvoicing";
import Card from "@/common/Card";
import { FileText, Settings } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { Invoice } from "../types/invoicing.types";
import DisabledStateBanner from "./DisabledStateBanner";
import InvoiceFilters from "./InvoiceFilters";
import InvoiceTable from "./InvoiceTable";
import InvoicePagination from "./InvoicePagination";
import CancelInvoiceModal from "./CancelInvoiceModal";

const InvoicePreview = lazy(() => import("./InvoicePreview"));

type StatusFilter = "all" | "EMITIDA" | "ANULADA";
type DocTypeFilter = "all" | "FACTURA" | "NOTA_DEBITO" | "NOTA_CREDITO";

interface DateRange {
  desde?: Date;
  hasta?: Date;
}

interface InvoiceListProps {
  onOpenSettings?: () => void;
}

export default function InvoiceList({ onOpenSettings }: InvoiceListProps) {
  const {
    isLoading,
    taxpayerInfo,
    invoices,
    loadInvoices,
    loadInvoice,
    cancelInvoice,
    isEnabled,
    checkEnabled,
  } = useInvoicing();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const itemsPerPage = 15;

  useEffect(() => {
    checkEnabled();
    loadInvoices();
  }, [checkEnabled, loadInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch = 
        !searchQuery ||
        invoice.invoiceNumber.includes(searchQuery) ||
        invoice.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.clienteRifCedula.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || invoice.estatus === statusFilter;
      const matchesType = docTypeFilter === "all" || invoice.tipoDocumento === docTypeFilter;

      const invoiceDate = new Date(invoice.createdAt);
      const matchesDate = 
        (!dateRange.desde || invoiceDate >= dateRange.desde) &&
        (!dateRange.hasta || invoiceDate <= dateRange.hasta);

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, docTypeFilter, dateRange]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredInvoices.length / itemsPerPage);
  }, [filteredInvoices.length]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredInvoices, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, docTypeFilter, dateRange]);

  const handleViewInvoice = useCallback(async (invoice: Invoice) => {
    await loadInvoice(invoice.localId);
    setSelectedInvoice(invoice);
  }, [loadInvoice]);

  const handleCancelInvoice = useCallback(async () => {
    if (!invoiceToCancel) return;
    await cancelInvoice(invoiceToCancel.localId, "");
    setInvoiceToCancel(null);
  }, [invoiceToCancel, cancelInvoice]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setDocTypeFilter("all");
    setDateRange({});
  }, []);

  if (!isEnabled) {
    return <DisabledStateBanner onOpenSettings={onOpenSettings} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar facturas y documentos fiscales">
            <FileText className="w-6 h-6" />
            Facturación
          </h2>
          <p className="text-slate-400">{filteredInvoices.length} documentos</p>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Configurar datos fiscales"
            className="flex items-center gap-2 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        )}
      </div>

      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        docTypeFilter={docTypeFilter}
        onDocTypeFilterChange={setDocTypeFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <InvoiceTable
          invoices={paginatedInvoices}
          isLoading={isLoading}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          docTypeFilter={docTypeFilter}
          dateRange={dateRange}
          onClearFilters={handleClearFilters}
          onView={handleViewInvoice}
          onCancel={setInvoiceToCancel}
        />

        <InvoicePagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredCount={filteredInvoices.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {selectedInvoice && taxpayerInfo && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-8">
              <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin mx-auto" />
              <p className="text-slate-400 mt-2 text-center">Cargando factura...</p>
            </div>
          </div>
        }>
          <InvoicePreview
            invoice={selectedInvoice}
            taxpayerInfo={taxpayerInfo}
            isOpen={true}
            onClose={() => setSelectedInvoice(null)}
          />
        </Suspense>
      )}

      <CancelInvoiceModal
        invoice={invoiceToCancel}
        onClose={() => setInvoiceToCancel(null)}
        onConfirm={handleCancelInvoice}
      />
    </div>
  );
}
