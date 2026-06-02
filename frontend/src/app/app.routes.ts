import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'investments',
    loadComponent: () =>
      import('./pages/investments/investments.component').then(m => m.InvestmentsComponent)
  },
  {
    path: 'investments/:id',
    loadComponent: () =>
      import('./pages/investment-detail/investment-detail.component').then(m => m.InvestmentDetailComponent)
  },
  {
    path: 'budget',
    loadComponent: () =>
      import('./pages/budget/budget.component').then(m => m.BudgetComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
