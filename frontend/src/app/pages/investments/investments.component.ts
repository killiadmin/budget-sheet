import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InvestmentService } from '../../services/investment.service';
import { Investment } from '../../models/investment.model';

@Component({
  selector: 'app-investments',
  imports: [CommonModule, RouterLink, DecimalPipe],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.css'
})
export class InvestmentsComponent implements OnInit {
  private investService = inject(InvestmentService);

  investments: Investment[] = [];
  loading = true;

  ngOnInit() {
    this.investService.getAll().subscribe(data => {
      this.investments = data;
      this.loading = false;
    });
  }

  getMetrics(inv: Investment) {
    return this.investService.computeMetrics(inv);
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      immobilier_locatif: '🏠 Immobilier',
      bourse: '📈 Bourse',
      assurance_vie: '🛡️ Assurance Vie',
      crypto: '₿ Crypto',
      autre: '📦 Autre'
    };
    return map[type] ?? type;
  }
}
