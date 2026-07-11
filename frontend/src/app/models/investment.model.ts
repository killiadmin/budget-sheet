export type InvestmentType =
  | 'type_a'
  | 'type_b'
  | 'type_c'
  | 'type_d'
  | 'type_e'
  | 'type_f'
  | 'type_g'
  | 'type_h';


export interface HistoriqueEntry {
  date: string;

  revenus?: number;
  charges?: number;
  cashflow?: number;

  valeurPortefeuille?: number;
  versement?: number;
  plusValueRealisee?: number;

  depenseTravaux?: number;
  depenseFrais?: number;

  interets?: number;
  capitalRestant?: number;
}

export type EvenementType =
  | 'depense_imprevue'
  | 'travaux'
  | 'frais'
  | 'versement_exceptionnel'
  | 'retrait'
  | 'arbitrage'
  | 'dividende'
  | 'revenu_manque'
  | 'autre';

export interface Evenement {
  id: string;
  date: string;
  type: EvenementType;
  montant: number; 
  description: string;
}


export type Frequence = 'mensuel' | 'trimestriel' | 'annuel' | 'unique';

export interface ChargeRecurrente {
  id: string;
  label: string;
  montant: number;
  frequence: Frequence;
  informatif?: boolean;
}

export interface RevenuRecurrent {
  id: string;
  label: string;
  montant: number;
  frequence: Frequence;
}

export interface DetailTypeA {
  localisation?: string;
  categorieBien: 'k1' | 'k2' | 'k3' | 'k4' | 'k5' | 'k6' | 'k7' | 'k8';
  surface?: number;
  prixAcquisition: number;
  fraisAcquisition: number;
  depenseInitiale: number;
  chargeFinancementMensuelle: number;
  tauxFinancement?: number;
  dureeFinancement?: number;
  soldeFinancementRestant?: number;
  regimeGestion?: 'r1' | 'r2' | 'r3' | 'r4';
  tauxUtilisationCible?: number;
}

export interface DetailTypeB {
  localisation?: string;
  categorieBien: string;
  prixAcquisition: number;
  fraisAcquisition: number;
  budgetTransformation: number;
  depenseTransformation: number;
  valeurCibleSortie: number;
  valeurReelleSortie?: number;
  dateMiseEnCirculation?: string;
  dateSortie?: string;
  fraisIntermediaireSortie?: number;
  margeBrute?: number;
}

export interface DetailTypeC {
  intermediaire: string;
  categorieCompte: 'k1' | 'k2' | 'k3' | 'autre';
  versementMensuelProgramme: number;
  lignes?: LigneTypeC[];
}

export interface LigneTypeC {
  code: string;
  nom: string;
  quantite: number;
  prixMoyenAcquisition: number;
  valeurActuelle: number;
}

export interface DetailTypeD {
  fournisseur: string;
  identifiantContrat?: string;
  dateOuverture: string;
  repartition: RepartitionTypeD[];
  versementMensuelProgramme: number;
  fraisGestionAnnuels: number;
}

export interface RepartitionTypeD {
  support: string;
  categorie: 'c1' | 'c2' | 'c3' | 'c4' | 'autre';
  montant: number;
  pourcentage: number;
  rendementAnnuel?: number;
}

export interface DetailTypeE {
  intermediaire: string;
  lignes?: LigneTypeE[];
}

export interface LigneTypeE {
  code: string;
  nom: string;
  quantite: number;
  prixMoyenAcquisition: number;
  valeurActuelle: number;
}

export interface DetailTypeF {
  intermediaire: string;
  categorieProjet: 'c1' | 'c2' | 'c3' | 'autre';
  tauxInteretAnnuel: number;
  dureeProjet: number;
  dateEcheance: string;
  statutRemboursement: 'en_cours' | 'rembourse' | 'retard' | 'defaut';
}

export interface DetailTypeG {
  fournisseur: string;
  categorieProduit: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'autre';
  tauxAnnuel: number;
  plafond?: number;
  versementMensuel?: number;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  icon: string;
  color: string;
  dateOuverture: string;
  dateFermeture?: string;
  dateDerniereMiseAJour?: string;
  statut: 'actif' | 'cloture' | 'vendu';
  tags?: string[];

  capitalInvesti: number;
  valeurActuelle: number;

  chargesRecurrentes: ChargeRecurrente[];
  revenusRecurrents: RevenuRecurrent[];

  evenements: Evenement[];

  historique: HistoriqueEntry[];

  detailTypeA?: DetailTypeA;
  detailTypeB?: DetailTypeB;
  detailTypeC?: DetailTypeC;
  detailTypeD?: DetailTypeD;
  detailTypeE?: DetailTypeE;
  detailTypeF?: DetailTypeF;
  detailTypeG?: DetailTypeG;

  notes?: string;
}

export interface InvestmentMetrics {
  plusValueLatente: number;
  performancePct: number;
  roi: number;

  revenusMensuelsBruts: number;
  chargesMensuelles: number;
  cashflowMensuelNet: number;

  rentabiliteBrute?: number;
  rentabiliteNette?: number;

  margeRevente?: number;
  margePct?: number;

  rendementAnnuelNet?: number;

  totalEntreesEvenements: number;
  totalSortiesEvenements: number;

  dureeDetentionMois: number;
}
