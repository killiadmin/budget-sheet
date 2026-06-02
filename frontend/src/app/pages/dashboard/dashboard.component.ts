import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

import { InvestmentService } from '../../services/investment.service';
import { BudgetService } from '../../services/budget.service';
import { Investment } from '../../models/investment.model';
import { BudgetData } from '../../models/budget.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, NgxChartsModule, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private investService = inject(InvestmentService);
  private budgetService = inject(BudgetService);

  investments: Investment[] = [];
  budget: BudgetData | null = null;
  loading = true;

  // KPIs
  totalPatrimoine = 0;
  totalCapitalInvesti = 0;
  cashflowMensuelTotal = 0;
  plusValueTotale = 0;
  revenusInvestissements = 0;
  depensesMoyennesMensuelles = 0;
  tauxEpargne = 0;

  // Chart data
  patrimoineChartData: any[] = [];
  cashflowChartData: any[] = [];
  depensesChartData: any[] = [];
  evolutionPatrimoineData: any[] = [];

  colorScheme: Color = {
    name: 'custom',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#38bdf8']
  };

  ngOnInit() {
    forkJoin({
      investments: this.investService.getAll(),
      budget: this.budgetService.getBudget()
    }).subscribe(({ investments, budget }) => {
      this.investments = investments;
      this.budget = budget;
      this.computeKpis();
      this.prepareCharts();
      this.loading = false;
    });
  }

  private computeKpis() {
    this.totalPatrimoine = this.investments.reduce((s, i) => s + i.valeurActuelle, 0);
    this.totalCapitalInvesti = this.investments.reduce((s, i) => s + i.capitalInvesti, 0);
    this.plusValueTotale = this.totalPatrimoine - this.investments.reduce((s, i) => s + i.prixAchat, 0);

    this.cashflowMensuelTotal = this.investments.reduce((s, inv) => {
      const m = this.investService.computeMetrics(inv);
      return s + m.cashflowMensuelNet;
    }, 0);

    this.revenusInvestissements = this.investments.reduce((s, inv) => {
      const m = this.investService.computeMetrics(inv);
      return s + m.totalRevenusMensuels;
    }, 0);

    if (this.budget) {
      const hist = this.budget.historiqueDepenses;
      this.depensesMoyennesMensuelles = hist.reduce((s, h) => s + h.total, 0) / hist.length;
      const revenu = this.budget.profil.revenuMensuelNet + this.revenusInvestissements;
      this.tauxEpargne = ((revenu - this.depensesMoyennesMensuelles) / revenu) * 100;
    }
  }

  private prepareCharts() {
    // Répartition patrimoine par type
    const byType: Record<string, number> = {};
    this.investments.forEach(inv => {
      const label = this.typeLabel(inv.type);
      byType[label] = (byType[label] ?? 0) + inv.valeurActuelle;
    });
    this.patrimoineChartData = Object.entries(byType).map(([name, value]) => ({ name, value }));

    // Cashflow mensuel des 6 derniers mois (investissements locatifs)
    const moisLabels = ['Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const immo = this.investments.filter(i => i.type === 'immobilier_locatif');

    this.cashflowChartData = immo.map(inv => ({
      name: inv.name,
      series: inv.historiqueCashflow.slice(-6).map((cf, idx) => ({
        name: moisLabels[idx],
        value: cf.cashflow ?? 0
      }))
    }));

    // Dépenses par catégorie (moyenne)
    if (this.budget) {
      const catSum: Record<string, number> = {};
      const catCount: Record<string, number> = {};
      this.budget.historiqueDepenses.forEach(mois => {
        mois.details.forEach(d => {
          catSum[d.categorie] = (catSum[d.categorie] ?? 0) + d.montant;
          catCount[d.categorie] = (catCount[d.categorie] ?? 0) + 1;
        });
      });
      this.depensesChartData = Object.entries(catSum).map(([name, total]) => ({
        name,
        value: Math.round(total / (catCount[name] || 1))
      }));
    }

    // Évolution valeur totale des placements financiers
    const financier = this.investments.find(i => i.type === 'bourse');
    const av = this.investments.find(i => i.type === 'assurance_vie');
    if (financier && av) {
      this.evolutionPatrimoineData = [
        {
          name: 'ETF',
          series: financier.historiqueCashflow.slice(-12).map(cf => ({
            name: this.shortMonth(cf.mois),
            value: cf.valeur ?? 0
          }))
        },
        {
          name: 'Assurance Vie',
          series: av.historiqueCashflow.slice(-12).map(cf => ({
            name: this.shortMonth(cf.mois),
            value: cf.valeur ?? 0
          }))
        }
      ];
    }
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      immobilier_locatif: 'Immobilier',
      bourse: 'Bourse',
      assurance_vie: 'Assurance Vie',
      crypto: 'Crypto',
      autre: 'Autre'
    };
    return map[type] ?? type;
  }

  private shortMonth(mois: string): string {
    const [, m] = mois.split('-');
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return months[parseInt(m, 10) - 1];
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  get investmentsSummary() {
    return this.investments.map(inv => ({
      inv,
      metrics: this.investService.computeMetrics(inv)
    }));
  }
}
