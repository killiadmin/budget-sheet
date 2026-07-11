import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Investment,
  InvestmentMetrics,
  InvestmentType,
} from '../models/investment.model';

/**
 * Service for managing investments, 
 * providing methods to retrieve investment data, compute metrics, 
 * and handle labels for different investment types and attributes.
 */
@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private http = inject(HttpClient);
  private labels: Record<string, Record<string, string>> = {};

  /**
   * Constructor for the InvestmentService.
   * Initializes the service and loads investment labels from a JSON file.
   * The labels are used for displaying human-readable names for investment types and attributes.
   */
  constructor() {
    this.http
      .get<
        Record<string, Record<string, string>>
      >('assets/data/investment-labels.json')
      .subscribe((labels) => (this.labels = labels));
  }

  getAll(): Observable<Investment[]> {
    return this.http.get<Investment[]>('assets/data/investments.json');
  }

  getById(id: string): Observable<Investment | undefined> {
    return this.getAll().pipe(map((list) => list.find((i) => i.id === id)));
  }

  /**
   * Marks an investment as updated.
   * 
   * @param id 
   * @returns 
   */
  markAsUpdated(
    id: string,
  ): Observable<{ id: string; dateDerniereMiseAJour: string }> {
    return this.http.patch<{ id: string; dateDerniereMiseAJour: string }>(
      `/api/investments/${id}/date`,
      {},
    );
  }

  /**
   * Converts an amount to a monthly equivalent based on its frequency.
   * 
   * @param montant 
   * @param frequence 
   * @returns 
   */
  toMensuel(montant: number, frequence: string): number {
    switch (frequence) {
      case 'mensuel':
        return montant;
      case 'trimestriel':
        return montant / 3;
      case 'annuel':
        return montant / 12;
      default:
        return 0;
    }
  }

  /**
   * Computes the total monthly charges for an investment.
   * 
   * @param inv 
   * @returns 
   */
  totalChargesMensuelles(inv: Investment): number {
    return inv.chargesRecurrentes
      .filter((c) => !c.informatif)
      .reduce((s, c) => s + this.toMensuel(c.montant, c.frequence), 0);
  }

  /**
   * Computes the total monthly revenues for an investment.
   * 
   * @param inv 
   * @returns 
   */
  totalRevenusMensuels(inv: Investment): number {
    return inv.revenusRecurrents.reduce(
      (s, r) => s + this.toMensuel(r.montant, r.frequence),
      0,
    );
  }

  /**
   * Computes the duration of investment holding in months.
   * 
   * @param inv 
   * @returns 
   */
  dureeDetentionMois(inv: Investment): number {
    const debut = new Date(inv.dateOuverture);
    const fin = inv.dateFermeture ? new Date(inv.dateFermeture) : new Date();
    return Math.floor(
      (fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );
  }

  /**
   * Computes the remaining months for financing.
   * 
   * @param inv 
   * @returns 
   */
  moisRestantsFinancement(inv: Investment): number | null {
    const d = inv.detailTypeA;
    if (!d?.dureeFinancement) return null;
    const moisEcoules = this.dureeDetentionMois(inv);
    return Math.max(0, d.dureeFinancement - moisEcoules) + 1;
  }

  /**
   * Computes the metrics for an investment.
   * 
   * @param inv 
   * @returns 
   */
  computeMetrics(inv: Investment): InvestmentMetrics {
    const chargesMensuelles = this.totalChargesMensuelles(inv);
    const revenusMensuelsBruts = this.totalRevenusMensuels(inv);
    const cashflowMensuelNet = revenusMensuelsBruts - chargesMensuelles;
    const dureeDetentionMois = this.dureeDetentionMois(inv);

    const totalEntreesEvenements = inv.evenements
      .filter((e) => e.montant > 0)
      .reduce((s, e) => s + e.montant, 0);
    const totalSortiesEvenements = inv.evenements
      .filter((e) => e.montant < 0)
      .reduce((s, e) => s + Math.abs(e.montant), 0);

    const dureeAns = dureeDetentionMois / 12 || 1;

    let plusValueLatente = inv.valeurActuelle - inv.capitalInvesti;
    let rentabiliteBrute: number | undefined;
    let rentabiliteNette: number | undefined;
    let margeRevente: number | undefined;
    let margePct: number | undefined;
    let rendementAnnuelNet: number | undefined;

    switch (inv.type) {
      case 'type_a': {
        const prix = inv.detailTypeA?.prixAcquisition ?? inv.capitalInvesti;
        const loyerAnnuel = revenusMensuelsBruts * 12;
        rentabiliteBrute = prix > 0 ? (loyerAnnuel / prix) * 100 : 0;
        rentabiliteNette =
          prix > 0 ? ((loyerAnnuel - chargesMensuelles * 12) / prix) * 100 : 0;
        plusValueLatente =
          inv.valeurActuelle -
          (inv.detailTypeA?.prixAcquisition ?? inv.capitalInvesti);
        break;
      }

      case 'type_b': {
        const d = inv.detailTypeB;
        if (d) {
          const totalInvesti =
            d.prixAcquisition + d.fraisAcquisition + d.depenseTransformation;
          const valeurSortie = d.valeurReelleSortie ?? d.valeurCibleSortie;
          const fraisSortie = d.fraisIntermediaireSortie ?? 0;
          margeRevente = valeurSortie - totalInvesti - fraisSortie;
          margePct = totalInvesti > 0 ? (margeRevente / totalInvesti) * 100 : 0;
          plusValueLatente = margeRevente;
        }
        break;
      }

      case 'type_c':
      case 'type_e': {
        const dernier = inv.historique[inv.historique.length - 1];
        const premier = inv.historique[0];
        if (dernier?.valeurPortefeuille && premier?.valeurPortefeuille) {
          const gain = dernier.valeurPortefeuille - inv.capitalInvesti;
          rendementAnnuelNet =
            dureeAns > 0 ? (gain / inv.capitalInvesti / dureeAns) * 100 : 0;
        }
        break;
      }

      case 'type_d':
      case 'type_g': {
        const intérêtsAnnuels = revenusMensuelsBruts * 12;
        rendementAnnuelNet =
          inv.capitalInvesti > 0
            ? (intérêtsAnnuels / inv.capitalInvesti) * 100
            : 0;
        break;
      }

      case 'type_f': {
        const taux = inv.detailTypeF?.tauxInteretAnnuel ?? 0;
        rendementAnnuelNet = taux;
        break;
      }

      case 'type_h': {
        const entriesWithData = inv.historique.filter(
          (h) => h.revenus !== undefined || h.charges !== undefined,
        );
        if (entriesWithData.length > 0) {
          const totalRev = entriesWithData.reduce(
            (s, h) => s + (h.revenus ?? 0),
            0,
          );
          const totalChg = entriesWithData.reduce(
            (s, h) => s + (h.charges ?? 0),
            0,
          );
          const moisAvecDonnees = entriesWithData.length;
          const revMoyenMois = totalRev / moisAvecDonnees;
          const chgMoyenMois = totalChg / moisAvecDonnees;

          if (revenusMensuelsBruts === 0 && totalRev > 0) {
            rendementAnnuelNet =
              inv.capitalInvesti > 0
                ? ((totalRev - totalChg) / inv.capitalInvesti / dureeAns) * 100
                : 0;
          }
        }
        break;
      }
    }

    const performancePct =
      inv.capitalInvesti > 0
        ? (plusValueLatente / inv.capitalInvesti) * 100
        : 0;
    const roi =
      inv.capitalInvesti > 0
        ? ((plusValueLatente + cashflowMensuelNet * 12) /
            inv.capitalInvesti /
            dureeAns) *
          100
        : 0;

    return {
      plusValueLatente,
      performancePct,
      roi,
      revenusMensuelsBruts,
      chargesMensuelles,
      cashflowMensuelNet,
      rentabiliteBrute,
      rentabiliteNette,
      margeRevente,
      margePct,
      rendementAnnuelNet,
      totalEntreesEvenements,
      totalSortiesEvenements,
      dureeDetentionMois,
    };
  }

  /**
   * Retrieves the label for a given group and code.
   * 
   * @param group 
   * @param code 
   * @returns 
   */
  label(group: string, code: string | undefined): string {
    if (!code) return '';
    return this.labels[group]?.[code] ?? code;
  }

  /**
   * Retrieves the label for a given investment type.
   * 
   * @param type 
   * @returns 
   */
  typeLabel(type: InvestmentType): string {
    return this.label('type', type);
  }

  /**
   * Computes the financial statement for an investment.
   * 
   * @param inv 
   * @returns 
   */
  bilanFinancier(inv: Investment): {
    capitalInvesti: number;
    chargesCumulees: number;
    totalEvenementsNegatifs: number;
    coutTotalReel: number;

    revenusCumules: number;
    plusValueLatente: number;
    totalEvenementsPositifs: number;

    gainNetSansPatrimoine: number;
    gainNetAvecPatrimoine: number;
    cashflowCumuleParMois: {
      date: string;
      cumul: number;
      revenus: number;
      charges: number;
    }[];
    seuilRentabiliteAtteint: boolean;
    moisPourRentabilite: number | null;

    evenementsNegatifs: {
      date: string;
      description: string;
      montant: number;
      type: string;
    }[];
    evenementsPositifs: {
      date: string;
      description: string;
      montant: number;
      type: string;
    }[];
  } {
    const revenusCumules = inv.historique.reduce(
      (s, h) => s + (h.revenus ?? 0),
      0,
    );
    const chargesCumulees = inv.historique.reduce(
      (s, h) => s + (h.charges ?? 0),
      0,
    );

    const evenementsNegatifs = inv.evenements
      .filter((e) => e.montant < 0)
      .map((e) => ({
        date: e.date,
        description: e.description,
        montant: Math.abs(e.montant),
        type: e.type,
      }));

    const evenementsPositifs = inv.evenements
      .filter((e) => e.montant > 0)
      .map((e) => ({
        date: e.date,
        description: e.description,
        montant: e.montant,
        type: e.type,
      }));

    const totalEvenementsNegatifs = evenementsNegatifs.reduce(
      (s, e) => s + e.montant,
      0,
    );
    const totalEvenementsPositifs = evenementsPositifs.reduce(
      (s, e) => s + e.montant,
      0,
    );

    const capitalInvesti = inv.capitalInvesti;
    const coutTotalReel =
      capitalInvesti + chargesCumulees + totalEvenementsNegatifs;

    const prixAcquisition = inv.detailTypeA?.prixAcquisition ?? capitalInvesti;
    const plusValueLatente = inv.valeurActuelle - prixAcquisition;

    const gainNetSansPatrimoine =
      revenusCumules +
      totalEvenementsPositifs -
      chargesCumulees -
      totalEvenementsNegatifs -
      capitalInvesti;

    const gainNetAvecPatrimoine = gainNetSansPatrimoine + plusValueLatente;

    let cumul = -capitalInvesti - totalEvenementsNegatifs + totalEvenementsPositifs;
    let moisPourRentabilite: number | null = null;
    let moisIndex = 0;

    /**
     * Computes the cumulative cash flow per month based on the investment's history.
     */
    const cashflowCumuleParMois = inv.historique.map((h) => {
      const revenus = h.revenus ?? 0;
      const charges = h.charges ?? 0;
      cumul += revenus - charges;
      moisIndex++;
      if (cumul >= 0 && moisPourRentabilite === null)
        moisPourRentabilite = moisIndex;
      return {
        date: h.date,
        cumul: Math.round(cumul * 100) / 100,
        revenus,
        charges,
      };
    });

    return {
      capitalInvesti: Math.round(capitalInvesti * 100) / 100,
      chargesCumulees: Math.round(chargesCumulees * 100) / 100,
      totalEvenementsNegatifs: Math.round(totalEvenementsNegatifs * 100) / 100,
      coutTotalReel: Math.round(coutTotalReel * 100) / 100,
      revenusCumules: Math.round(revenusCumules * 100) / 100,
      plusValueLatente: Math.round(plusValueLatente * 100) / 100,
      totalEvenementsPositifs: Math.round(totalEvenementsPositifs * 100) / 100,
      gainNetSansPatrimoine: Math.round(gainNetSansPatrimoine * 100) / 100,
      gainNetAvecPatrimoine: Math.round(gainNetAvecPatrimoine * 100) / 100,
      cashflowCumuleParMois,
      seuilRentabiliteAtteint: gainNetSansPatrimoine >= 0,
      moisPourRentabilite,
      evenementsNegatifs,
      evenementsPositifs,
    };
  }
}
