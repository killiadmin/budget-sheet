// Les libellés réels ne figurent jamais ici : chaque poste est identifié par un
// code opaque (id) dont le libellé humain est résolu à l'exécution depuis
// assets/data/budget-labels.json (non versionné, voir .gitignore /src/assets/data).
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
