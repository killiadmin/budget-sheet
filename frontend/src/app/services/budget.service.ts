import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BudgetData } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private http = inject(HttpClient);

  // Libellés humains chargés depuis un fichier non versionné (voir .gitignore
  // /src/assets/data) : le code source ne contient aucun libellé de poste réel.
  private labels: Record<string, Record<string, string>> = {};

  constructor() {
    this.http
      .get<Record<string, Record<string, string>>>('assets/data/budget-labels.json')
      .subscribe((labels) => (this.labels = labels));
  }

  getBudget(): Observable<BudgetData> {
    return this.http.get<BudgetData>('assets/data/budget.json');
  }

  label(group: string, code: string | undefined): string {
    if (!code) return '';
    return this.labels[group]?.[code] ?? code;
  }

  posteLabel(id: string): string {
    return this.label('poste', id);
  }
}
