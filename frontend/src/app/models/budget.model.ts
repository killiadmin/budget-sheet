export interface PosteBudget {
  id: string;
  montantMensuel: number;
  couleur: string;
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
  postesFixes: PosteBudget[];
}
