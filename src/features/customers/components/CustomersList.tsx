import { useEffect, useCallback, useState, useMemo } from "react";
import { useCustomers } from "../hooks/useCustomers";
import Card from "@/common/Card";
import { Users, Plus } from "lucide-react";
import type { Customer } from "@/lib/db";
import CustomerFilters from "./CustomerFilters";
import CustomerTable from "./CustomerTable";
import CustomerPagination from "./CustomerPagination";
import CustomerDetailModal from "./CustomerDetailModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import CustomerFormModal from "./CustomerFormModal";

type StatusFilter = "all" | "active" | "inactive";

export default function CustomersList() {
  const {
    customers,
    isLoading,
    totalCustomers,
    loadCustomers,
    removeCustomer,
    getCustomerHistory,
  } = useCustomers();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Invoice[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const itemsPerPage = 15;

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = 
        customer.nombreRazonSocial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.rifCedula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && customer.isActive) ||
        (statusFilter === "inactive" && !customer.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredCustomers.length / itemsPerPage);
  }, [filteredCustomers.length]);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCustomers, currentPage]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleDelete = useCallback(async () => {
    if (!customerToDelete) return;

    const result = await removeCustomer(customerToDelete.localId);
    if (result) {
      setCustomerToDelete(null);
    }
  }, [customerToDelete, removeCustomer]);

  const handleEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingCustomer(null);
  }, []);

  const handleSelectCustomer = useCallback(async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistory(false);
    setCustomerHistory([]);
  }, []);

  const handleToggleHistory = useCallback(async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    if (!selectedCustomer) return;

    setShowHistory(true);
    if (customerHistory.length === 0) {
      setLoadingHistory(true);
      const history = await getCustomerHistory(selectedCustomer.localId);
      setCustomerHistory(history);
      setLoadingHistory(false);
    }
  }, [showHistory, selectedCustomer, customerHistory.length, getCustomerHistory]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar clientes registrados">
            <Users className="w-6 h-6" />
            Clientes
          </h2>
          <p className="text-slate-400">{totalCustomers} clientes registrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          title="Agregar un nuevo cliente"
          className="flex items-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors shadow-lg shadow-(--brand-500)/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <Card>
        <CustomerFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <CustomerTable
          customers={paginatedCustomers}
          isLoading={isLoading}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onClearFilters={handleClearFilters}
          onAddFirst={() => setShowForm(true)}
          onView={handleSelectCustomer}
          onEdit={handleEdit}
          onDelete={setCustomerToDelete}
        />

        <CustomerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredCount={filteredCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          customerHistory={customerHistory}
          loadingHistory={loadingHistory}
          showHistory={showHistory}
          onClose={() => setSelectedCustomer(null)}
          onToggleHistory={handleToggleHistory}
          onEdit={() => {
            setSelectedCustomer(null);
            handleEdit(selectedCustomer);
          }}
          onDelete={() => {
            setSelectedCustomer(null);
            setCustomerToDelete(selectedCustomer);
          }}
        />
      )}

      <DeleteConfirmModal
        customer={customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDelete}
      />

      {showForm && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={handleCloseForm}
          onSave={() => {
            handleCloseForm();
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}

import type { Invoice } from "@/lib/db";
