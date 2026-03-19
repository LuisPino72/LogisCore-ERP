export * from './types/invoicing.types';
export * from './services/invoicing.service';
export * from './hooks/useInvoicing';
export * from './hooks/useInvoicingForPOS';
export { CustomerSelector } from './components/CustomerSelector';
export { default as InvoiceList } from './components/InvoiceList';
export { default as InvoiceSettings } from './components/InvoiceSettings';

import { lazy } from 'react';

export const InvoicePreview = lazy(() => 
  import('./components/InvoicePreview').then(m => ({ default: m.InvoicePreview }))
);

export const InvoicePDF = lazy(() => 
  import('./components/InvoicePDF').then(m => ({ default: m.InvoicePDF }))
);
