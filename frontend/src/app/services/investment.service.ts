import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Investment,
  InvestmentMetrics,
  InvestmentType,
} from '../models/investment.model';

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private http = inject(HttpClient);

  // Libellés humains chargés depuis un fichier non versionné (voir .gitignore
  // /src/assets/data) : le code source ne contient aucun nom de catégorie réel.
  private labels: Record<string, Record<string, string>> = {};

  constructor() {
    this.http
      .get<Record<string, Record<string, string>>>('assets/data/investment-labels.json')
      .subscribe((labels) => (this.labels = labels));
  }

  getAll(): Observable<Investment[]> {
    return this.http.get<Investment[]>('assets/data/investments.json');
  }

  getById(id: string): Observable<Investment | undefined> {
    return this.getAll().pipe(map((list) => list.find((i) => i.id === id)));
  }

  // Persiste la date du jour comme date de dernière mise à jour manuelle,
  // directement dans investments.json (via le petit serveur d'écriture local).
  markAsUpdated(id: string): Observable<{ id: string; dateDerniereMiseAJour: string }> {
    return this.http.patch<{ id: string; dateDerniereMiseAJour: string }>(
      `/api/investments/${id}/date`,
      {},
    );
  }

  // ── Conversion fréquence → montant mensuel ──────────────────
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

  totalChargesMensuelles(inv: Investment): number {
    return inv.chargesRecurrentes
      .filter((c) => !c.informatif)
      .reduce((s, c) => s + this.toMensuel(c.montant, c.frequence), 0);
  }

  totalRevenusMensuels(inv: Investment): number {
    return inv.revenusRecurrents.reduce(
      (s, r) => s + this.toMensuel(r.montant, r.frequence),
      0,
    );
  }

  // ── Durée de détention en mois ──────────────────────────────
  dureeDetentionMois(inv: Investment): number {
    const debut = new Date(inv.dateOuverture);
    const fin = inv.dateFermeture ? new Date(inv.dateFermeture) : new Date();
    return Math.floor(
      (fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );
  }

  // ── Calcul des métriques selon le type ──────────────────────
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

    // Plus-value / performance — base de calcul selon le type (voir switch ci-dessous)
    let plusValueLatente = inv.valeurActuelle - inv.capitalInvesti;

    // Métriques spécifiques
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
        // Si l'historique contient des revenus/charges (activité annexe)
        // on calcule un cashflow moyen depuis l'historique réel
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
          // Override les métriques avec la moyenne réelle de l'historique
          const revMoyenMois = totalRev / moisAvecDonnees;
          const chgMoyenMois = totalChg / moisAvecDonnees;
          // On retourne dans le bloc général avec les bonnes valeurs
          // Les métriques revenusMensuelsBruts / chargesMensuelles sont déjà calculées
          // depuis chargesRecurrentes/revenusRecurrents — si vides, on les corrige ici
          if (revenusMensuelsBruts === 0 && totalRev > 0) {
            // pas de revenusRecurrents mais historique présent → calcul depuis historique
            rendementAnnuelNet =
              inv.capitalInvesti > 0
                ? ((totalRev - totalChg) / inv.capitalInvesti / dureeAns) * 100
                : 0;
          }
        }
        break;
      }
    }

    // Performance / ROI — calculés après le switch pour rester cohérents
    // avec le plusValueLatente final (ex: base prixAcquisition pour le type A,
    // margeRevente pour le type B).
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

  // ── Labels lisibles (chargés depuis le fichier non versionné) ──
  label(group: string, code: string | undefined): string {
    if (!code) return '';
    return this.labels[group]?.[code] ?? code;
  }

  typeLabel(type: InvestmentType): string {
    return this.label('type', type);
  }

  // ─────────────────────────────────────────────────────────────
  // Bilan financier générique : intègre capital investi, charges/
  // revenus cumulés depuis l'historique, ET tous les événements
  // ponctuels (frais, travaux, imprévus, remboursements...).
  // Utilisable par tout type dont l'historique suit le schéma
  // revenus/charges (type A, type H à cash-flow, etc.) : les mêmes
  // règles s'appliquent, seul le libellé change selon le type
  // dans le composant.
  // ─────────────────────────────────────────────────────────────
  bilanFinancier(inv: Investment): {
    // ── Coûts ──────────────────────────────────────────────────
    capitalInvesti: number; // apport initial (bien, machine, fonds de départ...)
    chargesCumulees: number; // charges/dépenses réelles payées (historique)
    totalEvenementsNegatifs: number; // frais, travaux, imprévus... en plus des charges
    coutTotalReel: number; // capital + charges + événements négatifs

    // ── Revenus ────────────────────────────────────────────────
    revenusCumules: number; // revenus réellement encaissés (historique)
    plusValueLatente: number; // valeur actuelle − valeur/prix d'acquisition
    totalEvenementsPositifs: number; // remboursements, indemnités, ventes ponctuelles...

    // ── Bilan ──────────────────────────────────────────────────
    gainNetSansPatrimoine: number; // revenus − (charges + événements négatifs + capital)
    gainNetAvecPatrimoine: number; // gainNet + plus-value latente
    cashflowCumuleParMois: {
      date: string;
      cumul: number;
      revenus: number;
      charges: number;
    }[];
    seuilRentabiliteAtteint: boolean; // gainNetSansPatrimoine >= 0
    moisPourRentabilite: number | null; // 1er mois où le cumul repasse positif

    // ── Détail des événements ──────────────────────────────────
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
    // Revenus et charges réels depuis l'historique
    const revenusCumules = inv.historique.reduce(
      (s, h) => s + (h.revenus ?? 0),
      0,
    );
    const chargesCumulees = inv.historique.reduce(
      (s, h) => s + (h.charges ?? 0),
      0,
    );

    // Événements séparés en positifs / négatifs
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

    // Coût total réel = capital engagé + charges payées + frais/travaux/imprévus
    const capitalInvesti = inv.capitalInvesti;
    const coutTotalReel =
      capitalInvesti + chargesCumulees + totalEvenementsNegatifs;

    // Plus-value latente : sur le prix d'acquisition si connu (type A), sinon sur le capital investi
    const prixAcquisition = inv.detailTypeA?.prixAcquisition ?? capitalInvesti;
    const plusValueLatente = inv.valeurActuelle - prixAcquisition;

    // Gain net sans compter la revalorisation du bien/actif
    const gainNetSansPatrimoine =
      revenusCumules +
      totalEvenementsPositifs -
      chargesCumulees -
      totalEvenementsNegatifs -
      capitalInvesti;

    // Gain net en comptant la plus-value latente (vision patrimoine total)
    const gainNetAvecPatrimoine = gainNetSansPatrimoine + plusValueLatente;

    // Courbe cumulée mois par mois : on démarre dans le rouge (capital + événements
    // négatifs déjà engagés, événements positifs déjà perçus), puis on ajoute le
    // cash-flow réel mois par mois. On repère au passage le 1er mois où le cumul
    // redevient positif (seuil de rentabilité).
    let cumul =
      -capitalInvesti - totalEvenementsNegatifs + totalEvenementsPositifs;
    let moisPourRentabilite: number | null = null;
    let moisIndex = 0;
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
