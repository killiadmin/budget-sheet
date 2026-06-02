import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { switchMap } from 'rxjs';

import { InvestmentService } from '../../services/investment.service';
import { Investment, InvestmentMetrics } from '../../models/investment.model';

@Component({
  selector: 'app-investment-detail',
  imports: [CommonModule, RouterLink, NgxChartsModule, DecimalPipe, DatePipe],
  templateUrl: './investment-detail.component.html',
  styleUrl: './investment-detail.component.css'
})
export class InvestmentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private investService = inject(InvestmentService);

  investment: Investment | null = null;
  metrics: InvestmentMetrics | null = null;
  loading = true;

  cashflowChartData: any[] = [];
  chargesData: any[] = [];

  colorScheme: Color = {
    name: 'detail',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#38bdf8']
  };

  ngOnInit() {
    this.route.params.pipe(
      switchMap(p => this.investService.getById(p['id']))
    ).subscribe(inv => {
      if (inv) {
        this.investment = inv;
        this.metrics = this.investService.computeMetrics(inv);
        this.prepareCharts(inv);
      }
      this.loading = false;
    });
  }

  private prepareCharts(inv: Investment) {
    // Cashflow line chart
    if (inv.historiqueCashflow[0]?.cashflow !== undefined) {
      this.cashflowChartData = [
        {
          name: 'Revenus',
          series: inv.historiqueCashflow.map(cf => ({ name: this.shortMonth(cf.mois), value: cf.revenus ?? 0 }))
        },
        {
          name: 'Charges',
          series: inv.historiqueCashflow.map(cf => ({ name: this.shortMonth(cf.mois), value: cf.charges ?? 0 }))
        },
        {
          name: 'Cash-flow net',
          series: inv.historiqueCashflow.map(cf => ({ name: this.shortMonth(cf.mois), value: cf.cashflow ?? 0 }))
        }
      ];
    } else {
      // Financial: valeur chart
      this.cashflowChartData = [
        {
          name: 'Valeur portefeuille',
          series: inv.historiqueCashflow.map(cf => ({ name: this.shortMonth(cf.mois), value: cf.valeur ?? 0 }))
        }
      ];
    }

    // Charges breakdown
    this.chargesData = Object.entries(inv.charges)
      .filter(([, v]) => typeof v === 'number' && v > 0 && v < 100000)
      .map(([name, value]) => ({ name: this.chargeLabel(name), value }));
  }

  private shortMonth(mois: string): string {
    const [, m] = mois.split('-');
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return months[parseInt(m, 10) - 1];
  }

  private chargeLabel(key: string): string {
    const map: Record<string, string> = {
      copropriete: 'Copropriété',
      assurancePNO: 'Assurance PNO',
      taxeFonciere: 'Taxe foncière',
      gestion: 'Frais de gestion',
      entretienMensuel: 'Entretien',
      fraisGestion: 'Frais gestion',
      courtage: 'Courtage'
    };
    return map[key] ?? key;
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  get chargesEntries() {
    if (!this.investment) return [];
    return Object.entries(this.investment.charges)
      .filter(([, v]) => typeof v === 'number' && v > 0 && v < 100000)
      .map(([k, v]) => ({ label: this.chargeLabel(k), value: v as number }));
  }

  get revenusEntries() {
    if (!this.investment) return [];
    return Object.entries(this.investment.revenus)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v]) => ({ label: k, value: v as number }));
  }
}
