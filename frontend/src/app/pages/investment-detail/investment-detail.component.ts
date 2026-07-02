import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, inject
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {NgxChartsModule, Color, ScaleType, LegendPosition} from '@swimlane/ngx-charts';
import { curveMonotoneX } from 'd3-shape';

import { switchMap } from 'rxjs';

import { InvestmentService } from '../../services/investment.service';
import { Investment, InvestmentMetrics } from '../../models/investment.model';

@Component({
  selector: 'app-investment-detail',
  imports: [CommonModule, RouterLink, NgxChartsModule, DecimalPipe, DatePipe],
  templateUrl: './investment-detail.component.html',
  styleUrl: './investment-detail.component.css'
})
export class InvestmentDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  readonly investService = inject(InvestmentService);

  @ViewChild('lineChartHost') lineChartHost!: ElementRef;
  @ViewChild('pieChartHost')  pieChartHost!: ElementRef;

  investment: Investment | null = null;
  metrics: InvestmentMetrics | null = null;
  bilanFinancier: ReturnType<InvestmentService['bilanFinancier']> | null = null;
  loading = true;

  mainChartData:   any[] = [];
  secondChartData: any[] = [];   // évolution valeur (quand mainChart = intérêts)
  pieData: any[]         = [];
  barData: any[]         = [];

  curve = curveMonotoneX;
  lineView: [number, number] = [600, 280];
  pieView:  [number, number] = [320, 300];

  private resizeObserver?: ResizeObserver;

  colorScheme: Color = {
    name: 'detail',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#84cc16']
  };

  ngOnInit() {
    this.route.params.pipe(
      switchMap(p => this.investService.getById(p['id']))
    ).subscribe(inv => {
      if (inv) {
        this.investment = inv;
        this.metrics = this.investService.computeMetrics(inv);
        this.secondChartData = [];
        this.buildCharts(inv);
        if (inv.type === 'type_a' || this.isTypeHAvecCashflow()) {
          this.bilanFinancier = this.investService.bilanFinancier(inv);
        }
      }
      this.loading = false;
    });
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.updateSizes());
    setTimeout(() => {
      if (this.lineChartHost?.nativeElement) this.resizeObserver!.observe(this.lineChartHost.nativeElement);
      if (this.pieChartHost?.nativeElement)  this.resizeObserver!.observe(this.pieChartHost.nativeElement);
      this.updateSizes();
    }, 100);
  }

  ngOnDestroy() { this.resizeObserver?.disconnect(); }

  private updateSizes() {
    if (this.lineChartHost?.nativeElement) {
      const w = this.lineChartHost.nativeElement.offsetWidth;
      if (w > 0) this.lineView = [w - 32, 280];
    }
    if (this.pieChartHost?.nativeElement) {
      const w = this.pieChartHost.nativeElement.offsetWidth;
      if (w > 0) this.pieView = [w - 32 - 180, 300];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Construction des graphiques selon le type
  // ─────────────────────────────────────────────────────────────
  private buildCharts(inv: Investment) {
    const type = inv.type;

    // ── Types avec historique revenus/charges/cashflow ──────────
    // Type A ou type H, mais seulement si l'historique contient réellement
    // des entrées revenus/cashflow (un type A sans historique — ex: résidence
    // principale sans loyers — ne doit pas produire un graphique vide).
    const hasCashflowHistory = inv.historique.some(
      h => h.revenus !== undefined || h.cashflow !== undefined
    );

    if ((type === 'type_a' || type === 'type_h') && hasCashflowHistory) {
      const series = inv.historique.filter(
        h => h.revenus !== undefined || h.charges !== undefined
      );

      this.mainChartData = [
        {
          name: 'Revenus',
          series: series.map(h => ({ name: this.fmtMois(h.date), value: h.revenus ?? 0 }))
        },
        {
          name: 'Charges',
          series: series.map(h => ({ name: this.fmtMois(h.date), value: h.charges ?? 0 }))
        },
        {
          name: 'Cash-flow net',
          series: series.map(h => ({ name: this.fmtMois(h.date), value: h.cashflow ?? 0 }))
        }
      ];

      // Pie charges récurrentes (si présentes), sinon pie revenus vs charges cumulés
      if (inv.chargesRecurrentes.length > 0) {
        this.pieData = inv.chargesRecurrentes.map(c => ({ name: c.label, value: c.montant }));
      } else {
        // Résumé revenus/charges depuis l'historique
        const totalRev = series.reduce((s, h) => s + (h.revenus ?? 0), 0);
        const totalChg = series.reduce((s, h) => s + (h.charges ?? 0), 0);
        if (totalRev > 0 || totalChg > 0) {
          this.pieData = [
            { name: 'Revenus cumulés', value: totalRev },
            { name: 'Charges cumulées', value: totalChg }
          ];
        }
      }
    }

    // ── Type B ────────────────────────────────────────────────
    if (type === 'type_b') {
      this.barData = inv.historique
        .filter(h => (h.depenseTravaux ?? 0) + (h.depenseFrais ?? 0) > 0)
        .map(h => ({
          name: this.fmtMois(h.date),
          series: [
            { name: 'Dépenses',    value: h.depenseTravaux ?? 0 },
            { name: 'Frais/Autre', value: h.depenseFrais   ?? 0 }
          ]
        }));

      const d = inv.detailTypeB;
      if (d) {
        this.pieData = [
          { name: 'Dépenses réalisées', value: d.depenseTransformation },
          { name: 'Dépenses restantes', value: Math.max(0, d.budgetTransformation - d.depenseTransformation) },
          { name: 'Frais acquisition',  value: d.fraisAcquisition },
          { name: 'Frais sortie',       value: d.fraisIntermediaireSortie ?? 0 }
        ].filter(p => p.value > 0);
      }
    }

    // ── Types financiers (C / D / F / G) ─────────────────────────
    const isFinancier = ['type_c', 'type_d', 'type_g', 'type_f'].includes(type);
    const hasPortfolioHistory = inv.historique.some(h => h.valeurPortefeuille !== undefined);

    if (isFinancier || (type === 'type_h' && hasPortfolioHistory)) {
      const hasVersements = inv.historique.some(h => (h.versement ?? 0) > 0);
      const hasInterets   = inv.historique.some(h => (h.interets  ?? 0) > 0);

      // Pour les investissements financiers avec intérêts mensuels : on veut voir les intérêts
      // mois par mois EN PREMIER, puis la valeur du portefeuille en second graphique
      if (hasInterets) {
        // Graphique principal = intérêts mensuels (barres) + cumulé (ligne)
        this.mainChartData = [
          {
            name: 'Intérêts / dividendes du mois',
            series: inv.historique.map(h => ({
              name:  this.fmtMoisAnnee(h.date),
              value: Math.round((h.interets ?? 0) * 100) / 100
            }))
          },
          {
            name: 'Intérêts cumulés',
            series: this.cumulatif(
              inv.historique.map(h => ({
                name:  this.fmtMoisAnnee(h.date),
                value: h.interets ?? 0
              }))
            )
          }
        ];

        // Graphique secondaire = évolution de la valeur du portefeuille
        this.secondChartData = [
          {
            name: 'Valeur portefeuille',
            series: inv.historique.map(h => ({
              name:  this.fmtMoisAnnee(h.date),
              value: h.valeurPortefeuille ?? 0
            }))
          },
          ...(hasVersements ? [{
            name: 'Capital versé cumulé',
            series: this.cumulatif(
              inv.historique.map(h => ({
                name:  this.fmtMoisAnnee(h.date),
                value: h.versement ?? 0
              }))
            )
          }] : [])
        ];
      } else {
        this.mainChartData = [
          {
            name: 'Valeur',
            series: inv.historique.map(h => ({ name: this.fmtMoisAnnee(h.date), value: h.valeurPortefeuille ?? 0 }))
          },
          ...(hasVersements ? [{
            name: 'Capital versé cumulé',
            series: this.cumulatif(
              inv.historique.map(h => ({ name: this.fmtMoisAnnee(h.date), value: h.versement ?? 0 }))
            )
          }] : [])
        ];
      }

      // ── Pie type C : lignes si quantités renseignées, sinon valeur globale ──
      if (type === 'type_c' && inv.detailTypeC?.lignes?.length) {
        const lignesAvecValeur = inv.detailTypeC.lignes.filter(
          l => l.quantite > 0 && l.valeurActuelle > 0
        );
        if (lignesAvecValeur.length > 0) {
          // Lignes détaillées disponibles
          this.pieData = lignesAvecValeur.map(l => ({
            name: l.code,
            value: Math.round(l.quantite * l.valeurActuelle)
          }));
        } else {
          // Pas de quantités → affiche les lignes avec leur nom uniquement, valeur répartie équitablement
          const nb = inv.detailTypeC.lignes.length;
          const valParLigne = Math.round(inv.valeurActuelle / nb);
          this.pieData = inv.detailTypeC.lignes.map(l => ({
            name: `${l.code} — ${l.nom}`,
            value: valParLigne
          }));
        }
      }

      // ── Pie type D : répartition des supports ──
      if (type === 'type_d' && inv.detailTypeD?.repartition?.length) {
        this.pieData = inv.detailTypeD.repartition
          .filter(r => r.montant > 0)
          .map(r => ({ name: r.support, value: r.montant }));
      }

      // ── Pie type F : capital vs intérêts cumulés ──
      if (type === 'type_f') {
        const totalInterets = inv.historique.reduce((s, h) => s + (h.interets ?? 0), 0);
        this.pieData = [
          { name: 'Capital', value: inv.capitalInvesti },
          { name: 'Intérêts générés', value: Math.round(totalInterets) }
        ];
        // Remplacer le line chart par intérêts cumulés + capital
        this.mainChartData = [
          {
            name: 'Intérêts cumulés',
            series: this.cumulatif(
              inv.historique.map(h => ({ name: this.fmtMoisAnnee(h.date), value: h.interets ?? 0 }))
            )
          },
          {
            name: 'Capital',
            series: inv.historique.map(h => ({ name: this.fmtMoisAnnee(h.date), value: h.capitalRestant ?? inv.capitalInvesti }))
          }
        ];
      }

      // ── Pie type G : intérêts cumulés vs capital ──
      if (type === 'type_g') {
        const totalInterets = inv.historique.reduce((s, h) => s + (h.interets ?? 0), 0);
        this.pieData = [
          { name: 'Capital investi', value: inv.capitalInvesti },
          { name: 'Intérêts cumulés', value: Math.round(totalInterets) }
        ];
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  private cumulatif(series: { name: string; value: number }[]) {
    let cum = 0;
    return series.map(s => { cum += s.value; return { name: s.name, value: cum }; });
  }

  // "2025-08" → "Aoû" (label court pour axe X)
  private fmtMois(date: string): string {
    const [, m] = date.split('-');
    return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(m, 10) - 1] ?? date;
  }

  // "2025-08" → "Aoû 25" (label avec année pour éviter doublons sur plusieurs années)
  private fmtMoisAnnee(date: string): string {
    const [y, m] = date.split('-');
    const moisCourt = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(m, 10) - 1] ?? m;
    return `${moisCourt} ${y?.slice(2)}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers template
  // ─────────────────────────────────────────────────────────────
  fmt(v: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 2
    }).format(v);
  }

  fmtPct(v: number | undefined): string {
    return v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
  }

  // Détection du type pour le template
  isTypeA()      { return this.investment?.type === 'type_a'; }
  isTypeB()      { return this.investment?.type === 'type_b'; }
  isFinancier() {
    return ['type_c','type_d','type_g','type_f'].includes(this.investment?.type ?? '');
  }
  isTypeF() { return this.investment?.type === 'type_f'; }

  // Type H avec historique cashflow → affiche comme type A
  isTypeHAvecCashflow() {
    return this.investment?.type === 'type_h'
      && this.investment.historique.some(h => h.revenus !== undefined || h.cashflow !== undefined);
  }

  // Afficher la section charges/revenus récurrents
  hasChargesOuRevenus() {
    return (this.investment?.chargesRecurrentes?.length ?? 0) > 0
      || (this.investment?.revenusRecurrents?.length ?? 0) > 0;
  }

  hasPie()              { return this.pieData.length > 1; }
  hasBar()               { return this.barData.length > 0; }
  hasMainChart()        { return this.mainChartData.length > 0; }
  hasSecondChart()      { return this.secondChartData.length > 0; }

  // KPIs intérêts pour les investissements financiers
  get interetsStats() {
    if (!this.investment) return null;
    const hist = this.investment.historique.filter(h => (h.interets ?? 0) > 0);
    if (!hist.length) return null;
    const total   = hist.reduce((s, h) => s + (h.interets ?? 0), 0);
    const moyenne = total / hist.length;
    const min     = Math.min(...hist.map(h => h.interets ?? 0));
    const max     = Math.max(...hist.map(h => h.interets ?? 0));
    return {
      total:   Math.round(total   * 100) / 100,
      moyenne: Math.round(moyenne * 100) / 100,
      min:     Math.round(min     * 100) / 100,
      max:     Math.round(max     * 100) / 100,
      nbMois:  hist.length
    };
  }

  get lignesTypeC() {
    // N'afficher le tableau que si les lignes ont des données chiffrées
    return (this.investment?.detailTypeC?.lignes ?? []).filter(
      l => l.quantite > 0 || l.prixMoyenAcquisition > 0
    );
  }
  get lignesTypeE() { return this.investment?.detailTypeE?.lignes ?? []; }
  get repartitionTypeD() { return this.investment?.detailTypeD?.repartition ?? []; }

  protected readonly LegendPosition = LegendPosition;
}
