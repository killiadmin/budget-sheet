import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import {NgxChartsModule, Color, ScaleType} from '@swimlane/ngx-charts';
import { BudgetService } from '../../services/budget.service';
import { BudgetData, PosteBudget } from '../../models/budget.model';

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

  // Filtre d'affichage : postes inclus dans les totaux/graphiques
  private selectedIds = new Set<string>();

  // Charts
  repartitionFixeData: any[] = [];
  comparaisonPostesData: any[] = [];

  // Computed
  totalFixesMensuel = 0;
  soldeMensuel = 0;

  colorScheme: Color = {
    name: 'budget',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#4ade80']
  };

  ngOnInit() {
    this.budgetService.getBudget().subscribe(data => {
      this.budget = data;
      this.selectedIds = new Set(data.postesFixes.map(p => p.id));
      this.refresh();
      this.loading = false;
    });
  }

  private get postesAffiches(): PosteBudget[] {
    if (!this.budget) return [];
    return this.budget.postesFixes.filter(p => this.selectedIds.has(p.id));
  }

  private refresh() {
    this.compute();
    this.prepareCharts();
  }

  private compute() {
    if (!this.budget) return;
    this.totalFixesMensuel = this.postesAffiches.reduce((s, d) => s + d.montantMensuel, 0);
    this.soldeMensuel = this.budget.profil.revenuMensuelNet - this.totalFixesMensuel;
  }

  private prepareCharts() {
    const postes = this.postesAffiches;

    // Répartition par poste
    this.repartitionFixeData = postes.map(d => ({
      name: this.posteLabel(d.id),
      value: d.montantMensuel
    }));

    // Comparaison des postes, du plus élevé au plus faible
    this.comparaisonPostesData = postes
      .slice()
      .sort((a, b) => b.montantMensuel - a.montantMensuel)
      .map(d => ({ name: this.posteLabel(d.id), value: d.montantMensuel }));
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  togglePoste(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.refresh();
  }

  selectAll() {
    if (!this.budget) return;
    this.selectedIds = new Set(this.budget.postesFixes.map(p => p.id));
    this.refresh();
  }

  selectNone() {
    this.selectedIds.clear();
    this.refresh();
  }

  posteLabel(id: string): string {
    return this.budgetService.posteLabel(id);
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  get tauxEpargneObjectif(): number {
    if (!this.budget) return 0;
    return (this.budget.profil.epargneObjectif / this.budget.profil.revenuMensuelNet) * 100;
  }

  get depensesVsRevenu(): number {
    if (!this.budget) return 0;
    return (this.totalFixesMensuel / this.budget.profil.revenuMensuelNet) * 100;
  }
}
