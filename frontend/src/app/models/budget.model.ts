export interface DepenseFixe {
  id: string;
  categorie: string;
  label: string;
  montant: number;
  couleur: string;
}

export interface DepenseMensuelleDetail {
  categorie: string;
  montant: number;
}

export interface HistoriqueDepenseMois {
  mois: string;
  total: number;
  details: DepenseMensuelleDetail[];
}

export interface ProfilBudget {
  nom: string;
  revenuMensuelNet: number;
  revenuMensuelBrut: number;
  epargneObjectif: number;
  dateMAJ: string;
}

export interface BudgetData {
  profil: ProfilBudget;
  depensesFixesMensuelles: DepenseFixe[];
  historiqueDepenses: HistoriqueDepenseMois[];
}
