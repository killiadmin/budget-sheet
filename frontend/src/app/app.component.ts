import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

@Component({
  selector: 'app-root',
  imports: [ShellComponent],
  template: `<app-shell />`
})
export class AppComponent {}
