import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { curveMonotoneX } from 'd3-shape';

import { InvestmentService } from '../../services/investment.service';
import { BudgetService } from '../../services/budget.service';
import { Investment } from '../../models/investment.model';
import { BudgetData } from '../../models/budget.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, NgxChartsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly investService = inject(InvestmentService);
  private budgetService  = inject(BudgetService);

  @ViewChild('pieChartHost')       pieChartHost?: ElementRef;
  @ViewChild('barHorizontalHost')  barHorizontalHost?: ElementRef;
  @ViewChild('cashflowChartHost')  cashflowChartHost?: ElementRef;
  @ViewChild('evolutionChartHost') evolutionChartHost?: ElementRef;

  pieView:            [number, number] = [380, 300];
  barHorizontalView:  [number, number] = [520, 300];
  cashflowView:        [number, number] = [960, 260];
  evolutionView:       [number, number] = [960, 260];

  private resizeObserver?: ResizeObserver;

  investments: Investment[] = [];
  budget: BudgetData | null = null;
  loading = true;
  curve = curveMonotoneX;

  totalPatrimoine = 0;
  totalDetteRestante = 0;
  patrimoineNet = 0;
  totalCapitalInvesti = 0;
  cashflowMensuelTotal = 0;
  plusValueTotale = 0;
  revenusInvestissements = 0;
  depensesMoyennesMensuelles = 0;
  tauxEpargne = 0;

  patrimoineChartData: any[] = [];
  cashflowChartData: any[] = [];
  depensesChartData: any[] = [];
  evolutionFinancierData: any[] = [];

  colorScheme: Color = {
    name: 'custom',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#84cc16']
  };

  ngOnInit() {
    forkJoin({ investments: this.investService.getAll(), budget: this.budgetService.getBudget() })
      .subscribe(({ investments, budget }) => {
        this.investments = investments;
        this.budget = budget;
        this.computeKpis();
        this.prepareCharts();
        this.loading = false;

        setTimeout(() => this.attachResizeObserver(), 0);
      });
  }

  ngAfterViewInit() {
    this.attachResizeObserver();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private attachResizeObserver() {
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.updateSizes());
    }
    [this.pieChartHost, this.barHorizontalHost, this.cashflowChartHost, this.evolutionChartHost]
      .forEach(host => { if (host?.nativeElement) this.resizeObserver!.observe(host.nativeElement); });
    this.updateSizes();
  }

  private updateSizes() {
    const width = (host?: ElementRef) => host?.nativeElement?.offsetWidth ?? 0;

    const pieW = width(this.pieChartHost);
    if (pieW > 0) this.pieView = [Math.max(pieW - 180, 160), 300];

    const barW = width(this.barHorizontalHost);
    if (barW > 0) this.barHorizontalView = [Math.max(barW - 16, 200), 300];

    const cashflowW = width(this.cashflowChartHost);
    if (cashflowW > 0) this.cashflowView = [Math.max(cashflowW - 180, 300), 260];

    const evolutionW = width(this.evolutionChartHost);
    if (evolutionW > 0) this.evolutionView = [Math.max(evolutionW - 180, 300), 260];
  }

  /**
   * Computes key performance indicators (KPIs) based on the current investments and budget data.
   */
  private computeKpis() {
    this.totalPatrimoine    = this.investments.reduce((s, i) => s + i.valeurActuelle, 0);
    this.totalCapitalInvesti = this.investments.reduce((s, i) => s + i.capitalInvesti, 0);
    this.plusValueTotale = this.investments.reduce((s, inv) => {
      return s + this.investService.computeMetrics(inv).plusValueLatente;
    }, 0);

    this.totalDetteRestante = this.investments.reduce((s, i) => {
      return s + (i.detailTypeA?.soldeFinancementRestant ?? 0);
    }, 0);
    this.patrimoineNet = this.totalPatrimoine - this.totalDetteRestante;

    this.cashflowMensuelTotal = this.investments.reduce((s, inv) => {
      const m = this.investService.computeMetrics(inv);
      return s + m.cashflowMensuelNet;
    }, 0);

    this.revenusInvestissements = this.investments.reduce((s, inv) => {
      return s + this.investService.totalRevenusMensuels(inv);
    }, 0);

    if (this.budget) {
      this.depensesMoyennesMensuelles = this.budget.postesFixes.reduce((s, p) => s + p.montantMensuel, 0);
      const revenu = this.budget.profil.revenuMensuelNet + this.revenusInvestissements;
      this.tauxEpargne = ((revenu - this.depensesMoyennesMensuelles) / revenu) * 100;
    }
  }

  /**
   * Prepares the data for various charts displayed on the dashboard, including patrimoine distribution, cashflow trends, and financial evolution.
   */
  private prepareCharts() {
    const byType: Record<string, number> = {};
    this.investments.forEach(inv => {
      const label = this.investService.typeLabel(inv.type as any).replace(/^. /, '');
      byType[label] = (byType[label] ?? 0) + inv.valeurActuelle;
    });
    this.patrimoineChartData = Object.entries(byType).map(([name, value]) => ({ name, value }));

    const typeA = this.investments.filter(i => i.type === 'type_a');
    const moisLabels = ['Jul','Aoû','Sep','Oct','Nov','Déc'];
    this.cashflowChartData = typeA.map(inv => ({
      name: inv.name,
      series: inv.historique.slice(-6).map((cf, idx) => ({
        name: moisLabels[idx],
        value: cf.cashflow ?? 0
      }))
    }));

    if (this.budget) {
      this.depensesChartData = this.budget.postesFixes
        .slice()
        .sort((a, b) => b.montantMensuel - a.montantMensuel)
        .map(p => ({ name: this.budgetService.posteLabel(p.id), value: p.montantMensuel }));
    }

    const financiers = this.investments.filter(i => ['type_c', 'type_d'].includes(i.type));
    this.evolutionFinancierData = financiers.map(inv => ({
      name: inv.name,
      series: inv.historique.slice(-12).map(h => ({
        name: this.shortMonth(h.date),
        value: h.valeurPortefeuille ?? 0
      }))
    })).filter(s => s.series.some(p => p.value > 0));
  }

  private shortMonth(date: string): string {
    const [, m] = date.split('-');
    return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(m, 10) - 1];
  }

  fmt(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  get summaryRows() {
    return this.investments.map(inv => ({ inv, m: this.investService.computeMetrics(inv) }));
  }
}
