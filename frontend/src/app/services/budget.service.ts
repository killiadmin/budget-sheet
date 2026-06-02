import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BudgetData } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private http = inject(HttpClient);

  getBudget(): Observable<BudgetData> {
    return this.http.get<BudgetData>('assets/data/budget.json');
  }
}
