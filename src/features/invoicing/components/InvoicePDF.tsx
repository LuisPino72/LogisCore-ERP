import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { Invoice, TaxpayerInfo } from '@/lib/db';
import { PROVIDENCIA_LEYENDA } from '../types/invoicing.types';

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 15,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  companyRif: {
    fontSize: 11,
    marginBottom: 3,
    color: '#4a4a4a',
  },
  companyAddress: {
    fontSize: 9,
    color: '#6b6b6b',
    marginTop: 4,
    maxWidth: 280,
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#4a4a4a',
    marginBottom: 2,
  },
  controlNumber: {
    fontSize: 10,
    color: '#6b6b6b',
  },
  dateSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 8,
    color: '#6b6b6b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  clientSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#6b6b6b',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#1a1a1a',
  },
  clientRif: {
    fontSize: 10,
    color: '#4a4a4a',
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 9,
    color: '#6b6b6b',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    color: '#6b6b6b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  colCodigo: { width: '12%' },
  colDescripcion: { width: '38%' },
  colCantidad: { width: '10%', textAlign: 'right' },
  colPrecio: { width: '15%', textAlign: 'right' },
  colIva: { width: '10%', textAlign: 'center' },
  colTotal: { width: '15%', textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: '#1a1a1a',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsBox: {
    width: 220,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 10,
    color: '#4a4a4a',
  },
  totalValue: {
    fontSize: 10,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  totalFinal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalFinalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  igtfSection: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  igtfTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  igtfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  igtfLabel: {
    fontSize: 9,
    color: '#92400e',
  },
  igtfValue: {
    fontSize: 9,
    color: '#92400e',
    textAlign: 'right',
  },
  igtfTotal: {
    borderTopWidth: 1,
    borderTopColor: '#f59e0b',
    paddingTop: 6,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 35,
    left: 40,
    right: 40,
  },
  footerLegend: {
    fontSize: 7,
    color: '#6b6b6b',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 1.4,
  },
  footerHash: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
  },
  taxInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  taxInfoItem: {
    alignItems: 'center',
  },
  taxInfoLabel: {
    fontSize: 7,
    color: '#6b6b6b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  taxInfoValue: {
    fontSize: 10,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  taxpayerInfo: TaxpayerInfo;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, taxpayerInfo }) => {
  const providenciaKey = taxpayerInfo.numeroProvidencia || '0071';
  const providenciaText = PROVIDENCIA_LEYENDA[providenciaKey as keyof typeof PROVIDENCIA_LEYENDA] || PROVIDENCIA_LEYENDA['0071'];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{invoice.emisorRazonSocial}</Text>
            <Text style={styles.companyRif}>{invoice.emisorRif}</Text>
            <Text style={styles.companyAddress}>{invoice.emisorDireccion}</Text>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.title}>FACTURA</Text>
            <Text style={styles.invoiceNumber}>N° {invoice.invoiceNumber}</Text>
            <Text style={styles.controlNumber}>Control: {invoice.controlNumber}</Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Fecha de Emisión</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.createdAt)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Tasa de Cambio</Text>
            <Text style={styles.dateValue}>Bs. {invoice.tasaBcv.toFixed(4)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Estatus</Text>
            <Text style={styles.dateValue}>{invoice.estatus}</Text>
          </View>
        </View>

        <View style={styles.clientSection}>
          <Text style={styles.sectionTitle}>Datos del Cliente</Text>
          <Text style={styles.clientName}>{invoice.clienteNombre}</Text>
          <Text style={styles.clientRif}>{invoice.clienteRifCedula}</Text>
          {invoice.clienteDireccion && (
            <Text style={styles.clientAddress}>{invoice.clienteDireccion}</Text>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colCodigo]}>Código</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescripcion]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, styles.colCantidad]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrecio]}>Precio USD</Text>
            <Text style={[styles.tableHeaderCell, styles.colIva]}>IVA %</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total Bs.</Text>
          </View>

          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colCodigo]}>{item.codigo || '-'}</Text>
              <Text style={[styles.cellText, styles.colDescripcion]}>{item.descripcion}</Text>
              <Text style={[styles.cellText, styles.colCantidad]}>
                {item.cantidad} {item.unidad}
              </Text>
              <Text style={[styles.cellText, styles.colPrecio]}>
                {formatUsd(item.precioUnitarioUsd)}
              </Text>
              <Text style={[styles.cellText, styles.colIva]}>
                {item.exento ? 'EX' : `${item.alicuotaIva}%`}
              </Text>
              <Text style={[styles.cellText, styles.colTotal]}>
                {formatCurrency(item.totalBs)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal USD:</Text>
              <Text style={styles.totalValue}>{formatUsd(invoice.subtotalUsd)}</Text>
            </View>
            {invoice.montoExentoBs > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Exento USD:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.montoExentoBs)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Base Imponible:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.baseImponibleBs)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA ({invoice.items.find(i => !i.exento)?.alicuotaIva || 16}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.montoIvaBs)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalFinal]}>
              <Text style={styles.totalFinalLabel}>TOTAL Bs:</Text>
              <Text style={styles.totalFinalValue}>{formatCurrency(invoice.totalBs)}</Text>
            </View>
          </View>
        </View>

        {invoice.aplicaIgtf && invoice.montoIgtfBs && invoice.montoIgtfBs > 0 && (
          <View style={styles.igtfSection}>
            <Text style={styles.igtfTitle}>IGTF - Impuesto a las Grandes Transacciones Financieras (3%)</Text>
            <View style={styles.igtfRow}>
              <Text style={styles.igtfLabel}>Monto Pagado en Divisas:</Text>
              <Text style={styles.igtfValue}>{formatUsd(invoice.subtotalUsd)}</Text>
            </View>
            <View style={styles.igtfRow}>
              <Text style={styles.igtfLabel}>IGTF (3%):</Text>
              <Text style={styles.igtfValue}>{formatCurrency(invoice.montoIgtfBs)}</Text>
            </View>
            <View style={styles.igtfTotal}>
              <Text style={styles.igtfLabel}>TOTAL A PAGAR:</Text>
              <Text style={styles.igtfValue}>{formatCurrency(invoice.totalFinalBs)}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerLegend}>{providenciaText}</Text>
          {invoice.hashSeguridad && (
            <Text style={styles.footerHash}>Hash: {invoice.hashSeguridad}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
