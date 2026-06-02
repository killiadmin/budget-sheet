export type InvestmentType = 'immobilier_locatif' | 'bourse' | 'assurance_vie' | 'crypto' | 'autre';

export interface DepenseImprevue {
  date: string;
  montant: number;
  description: string;
}

export interface CashflowEntry {
  mois: string;
  revenus?: number;
  charges?: number;
  cashflow?: number;
  valeur?: number;
  invest?: number;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  icon: string;
  color: string;
  dateAcquisition: string;
  statut: 'actif' | 'cloture' | 'vendu';
  capitalInvesti: number;
  prixAchat: number;
  valeurActuelle: number;
  creditMensuel: number;
  charges: Record<string, number>;
  revenus: Record<string, number>;
  depensesImprevues: DepenseImprevue[];
  historiqueCashflow: CashflowEntry[];
  versementsMensuels?: number;
  notes?: string;
}

export interface InvestmentMetrics {
  cashflowMensuelNet: number;
  rentabiliteBrute: number;
  rentabiliteNette: number;
  plusValueLatente: number;
  totalChargesMensuelles: number;
  totalRevenusMensuels: number;
  totalDepensesImprevues: number;
  roi: number;
  tauxOccupation?: number;
}
