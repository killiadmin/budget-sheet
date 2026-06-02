import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import {NgxChartsModule, Color, ScaleType} from '@swimlane/ngx-charts';
import { BudgetService } from '../../services/budget.service';
import { BudgetData } from '../../models/budget.model';

@Component({
  selector: 'app-budget',
  imports: [CommonModule, NgxChartsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.css'
})
export class BudgetComponent implements OnInit {
  private budgetService = inject(BudgetService);

  budget: BudgetData | null = null;
  loading = true;

  // Charts
  depensesParCategorieData: any[] = [];
  evolutionDepensesData: any[] = [];
  repartitionFixeData: any[] = [];

  // Computed
  totalFixesMensuel = 0;
  soldeMensuelMoyen = 0;
  depenseMoisActuel = 0;
  moisSelectionne = '2024-12';

  colorScheme: Color = {
    name: 'budget',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#4ade80']
  };

  ngOnInit() {
    this.budgetService.getBudget().subscribe(data => {
      this.budget = data;
      this.compute();
      this.prepareCharts();
      this.loading = false;
    });
  }

  private compute() {
    if (!this.budget) return;
    this.totalFixesMensuel = this.budget.depensesFixesMensuelles.reduce((s, d) => s + d.montant, 0);
    const hist = this.budget.historiqueDepenses;
    this.soldeMensuelMoyen = this.budget.profil.revenuMensuelNet -
      (hist.reduce((s, h) => s + h.total, 0) / hist.length);
    this.depenseMoisActuel = hist[hist.length - 1]?.total ?? 0;
  }

  private prepareCharts() {
    if (!this.budget) return;

    // Répartition par catégorie (dépenses fixes)
    this.repartitionFixeData = this.budget.depensesFixesMensuelles.map(d => ({
      name: d.label,
      value: d.montant
    }));

    // Évolution mensuelle totale
    this.evolutionDepensesData = [{
      name: 'Dépenses totales',
      series: this.budget.historiqueDepenses.map(h => ({
        name: this.shortMonth(h.mois),
        value: h.total
      }))
    }, {
      name: 'Revenu net',
      series: this.budget.historiqueDepenses.map(h => ({
        name: this.shortMonth(h.mois),
        value: this.budget!.profil.revenuMensuelNet
      }))
    }];

    // Par catégorie : stacked bar
    const categories = ['Logement', 'Transport', 'Alimentation', 'Santé', 'Loisirs', 'Épargne', 'Divers'];
    this.depensesParCategorieData = categories.map(cat => ({
      name: cat,
      series: this.budget!.historiqueDepenses.slice(-6).map(h => ({
        name: this.shortMonth(h.mois),
        value: h.details.find(d => d.categorie === cat)?.montant ?? 0
      }))
    }));
  }

  private shortMonth(mois: string): string {
    const [, m] = mois.split('-');
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return months[parseInt(m, 10) - 1];
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  get tauxEpargneObjectif(): number {
    if (!this.budget) return 0;
    return (this.budget.profil.epargneObjectif / this.budget.profil.revenuMensuelNet) * 100;
  }

  get depensesVsBudget(): number {
    if (!this.budget) return 0;
    return (this.depenseMoisActuel / this.budget.profil.revenuMensuelNet) * 100;
  }
}
