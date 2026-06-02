import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Investment, InvestmentMetrics } from '../models/investment.model';

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private http = inject(HttpClient);

  getAll(): Observable<Investment[]> {
    // Essayez avec un slash au début
    return this.http.get<Investment[]>('/assets/data/investments.json');
  }

  getById(id: string): Observable<Investment | undefined> {
    return this.getAll().pipe(
      map(investments => investments.find(i => i.id === id))
    );
  }

  computeMetrics(inv: Investment): InvestmentMetrics {
    const totalChargesMensuelles = Object.values(inv.charges)
      .filter(v => typeof v === 'number' && v > 0 && v < 100)
      .reduce((sum, v) => sum + v, 0) + inv.creditMensuel;

    const totalRevenusMensuels = inv.revenus['loyerMensuel'] ?? inv.revenus['dividendesMensuelMoyen'] ?? 0;

    const cashflowMensuelNet = totalRevenusMensuels - totalChargesMensuelles;

    const rentabiliteBrute = inv.revenus['loyerMensuel']
      ? (inv.revenus['loyerMensuel'] * 12) / inv.prixAchat * 100
      : inv.revenus['rendementAnnuel'] ?? 0;

    const chargesAnnuelles = totalChargesMensuelles * 12;
    const revenusAnnuels = totalRevenusMensuels * 12;
    const rentabiliteNette = inv.prixAchat > 0
      ? ((revenusAnnuels - chargesAnnuelles) / inv.prixAchat) * 100
      : 0;

    const plusValueLatente = inv.valeurActuelle - inv.prixAchat;

    const totalDepensesImprevues = inv.depensesImprevues
      .reduce((sum, d) => sum + d.montant, 0);

    const roi = inv.capitalInvesti > 0
      ? ((plusValueLatente + (cashflowMensuelNet * 12)) / inv.capitalInvesti) * 100
      : 0;

    return {
      cashflowMensuelNet,
      rentabiliteBrute,
      rentabiliteNette,
      plusValueLatente,
      totalChargesMensuelles,
      totalRevenusMensuels,
      totalDepensesImprevues,
      roi
    };
  }
}
