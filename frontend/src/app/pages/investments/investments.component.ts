import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InvestmentService } from '../../services/investment.service';
import { Investment, InvestmentType } from '../../models/investment.model';

@Component({
  selector: 'app-investments',
  imports: [CommonModule, RouterLink],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.css'
})
export class InvestmentsComponent implements OnInit {
  readonly investService = inject(InvestmentService);

  investments: Investment[] = [];
  loading = true;
  filterType: InvestmentType | 'tous' = 'tous';

  // Libellés résolus à l'exécution via InvestmentService.label() (fichier non versionné)
  private readonly filterableTypes: InvestmentType[] =
    ['type_a', 'type_b', 'type_c', 'type_d', 'type_e', 'type_f', 'type_g'];

  get allTypes(): Array<{ value: InvestmentType | 'tous'; label: string }> {
    return [
      { value: 'tous', label: 'Tous' },
      ...this.filterableTypes.map((value) => ({ value, label: this.investService.typeLabel(value) })),
    ];
  }

  ngOnInit() {
    this.investService.getAll().subscribe(data => {
      this.investments = data;
      this.loading = false;
    });
  }

  get filtered(): Investment[] {
    return this.filterType === 'tous'
      ? this.investments
      : this.investments.filter(i => i.type === this.filterType);
  }

  fmt(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  fmtPct(v: number | undefined): string {
    if (v === undefined) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  }

  get totalPatrimoine(): number { return this.filtered.reduce((s, i) => s + i.valeurActuelle, 0); }
  get totalCapital(): number    { return this.filtered.reduce((s, i) => s + i.capitalInvesti, 0); }
  get totalPlusValue(): number  { return this.totalPatrimoine - this.totalCapital; }
}
