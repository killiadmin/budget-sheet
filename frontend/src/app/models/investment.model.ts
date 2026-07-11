// ─────────────────────────────────────────────────────────────
// Types d'investissements supportés
// Libellés humains chargés à l'exécution depuis un fichier non
// versionné (voir InvestmentService.loadLabels) — volontairement
// absents du code source.
// ─────────────────────────────────────────────────────────────
export type InvestmentType =
  | 'type_a'
  | 'type_b'
  | 'type_c'
  | 'type_d'
  | 'type_e'
  | 'type_f'
  | 'type_g'
  | 'type_h';

// ─────────────────────────────────────────────────────────────
// Entrées d'historique — shape différente selon le type
// ─────────────────────────────────────────────────────────────
export interface HistoriqueEntry {
  date: string;           // YYYY-MM

  // Flux périodiques
  revenus?: number;
  charges?: number;
  cashflow?: number;

  // Valorisation / mouvements de portefeuille
  valeurPortefeuille?: number;
  versement?: number;
  plusValueRealisee?: number;

  // Dépenses ponctuelles liées à une opération
  depenseTravaux?: number;
  depenseFrais?: number;

  // Rendement périodique
  interets?: number;
  capitalRestant?: number;
}

// ─────────────────────────────────────────────────────────────
// Événements ponctuels (travaux, incident, arbitrage, etc.)
// ─────────────────────────────────────────────────────────────
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
  montant: number;         // positif = entrée, négatif = sortie
  description: string;
}

// ─────────────────────────────────────────────────────────────
// Charges récurrentes (label libre + fréquence)
// ─────────────────────────────────────────────────────────────
export type Frequence = 'mensuel' | 'trimestriel' | 'annuel' | 'unique';

export interface ChargeRecurrente {
  id: string;
  label: string;
  montant: number;
  frequence: Frequence;
  informatif?: boolean;   // affichée dans le détail mais exclue du total (ex: montant déjà inclus dans une autre charge)
}

// ─────────────────────────────────────────────────────────────
// Revenus récurrents
// ─────────────────────────────────────────────────────────────
export interface RevenuRecurrent {
  id: string;
  label: string;
  montant: number;
  frequence: Frequence;
}

// ─────────────────────────────────────────────────────────────
// Données spécifiques par type — optionnelles selon le cas.
// Les noms de champs et les codes de valeurs sont volontairement
// génériques : les libellés humains vivent uniquement dans le
// fichier de labels non versionné.
// ─────────────────────────────────────────────────────────────

export interface DetailTypeA {
  localisation?: string;
  categorieBien: 'k1' | 'k2' | 'k3' | 'k4' | 'k5' | 'k6' | 'k7' | 'k8';
  surface?: number;
  prixAcquisition: number;
  fraisAcquisition: number;
  depenseInitiale: number;
  chargeFinancementMensuelle: number;
  tauxFinancement?: number;
  dureeFinancement?: number;          // mois
  soldeFinancementRestant?: number;
  regimeGestion?: 'r1' | 'r2' | 'r3' | 'r4';
  tauxUtilisationCible?: number;      // %
}

export interface DetailTypeB {
  localisation?: string;
  categorieBien: string;
  prixAcquisition: number;
  fraisAcquisition: number;
  budgetTransformation: number;
  depenseTransformation: number;
  valeurCibleSortie: number;
  valeurReelleSortie?: number;        // rempli si finalisé
  dateMiseEnCirculation?: string;
  dateSortie?: string;
  fraisIntermediaireSortie?: number;
  margeBrute?: number;                // calculée à la sortie
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
  fraisGestionAnnuels: number;        // %
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
  tauxInteretAnnuel: number;          // %
  dureeProjet: number;                // mois
  dateEcheance: string;
  statutRemboursement: 'en_cours' | 'rembourse' | 'retard' | 'defaut';
}

export interface DetailTypeG {
  fournisseur: string;
  categorieProduit: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'autre';
  tauxAnnuel: number;                 // %
  plafond?: number;
  versementMensuel?: number;
}

// ─────────────────────────────────────────────────────────────
// Modèle principal Investment
// ─────────────────────────────────────────────────────────────
export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  icon: string;
  color: string;
  dateOuverture: string;         // date de création / acquisition
  dateFermeture?: string;        // si clôturé
  dateDerniereMiseAJour?: string; // dernière mise à jour manuelle des données (YYYY-MM-DD)
  statut: 'actif' | 'cloture' | 'vendu';
  tags?: string[];

  // Financier générique
  capitalInvesti: number;        // somme totale apportée (fonds propres)
  valeurActuelle: number;        // valeur de marché aujourd'hui

  // Charges et revenus récurrents (structure unifiée)
  chargesRecurrentes: ChargeRecurrente[];
  revenusRecurrents: RevenuRecurrent[];

  // Événements ponctuels
  evenements: Evenement[];

  // Historique mensuel
  historique: HistoriqueEntry[];

  // Détails spécifiques par type (au plus un rempli)
  detailTypeA?: DetailTypeA;
  detailTypeB?: DetailTypeB;
  detailTypeC?: DetailTypeC;
  detailTypeD?: DetailTypeD;
  detailTypeE?: DetailTypeE;
  detailTypeF?: DetailTypeF;
  detailTypeG?: DetailTypeG;

  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Métriques calculées (agnostiques du type)
// ─────────────────────────────────────────────────────────────
export interface InvestmentMetrics {
  // Commun à tous
  plusValueLatente: number;       // valeurActuelle - capitalInvesti
  performancePct: number;         // (plusValueLatente / capitalInvesti) * 100
  roi: number;                    // rendement total annualisé estimé

  // Flux mensuels
  revenusMensuelsBruts: number;
  chargesMensuelles: number;      // ramené au mois (quelle que soit la fréquence)
  cashflowMensuelNet: number;

  // Rentabilité
  rentabiliteBrute?: number;
  rentabiliteNette?: number;

  // Marge de sortie
  margeRevente?: number;
  margePct?: number;

  // Rendement périodique
  rendementAnnuelNet?: number;

  // Totaux événements
  totalEntreesEvenements: number;
  totalSortiesEvenements: number;

  // Durée
  dureeDetentionMois: number;
}
