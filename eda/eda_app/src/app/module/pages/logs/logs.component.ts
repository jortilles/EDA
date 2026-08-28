import { Component } from '@angular/core';
import { TabViewModule } from 'primeng/tabview';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { ServerConsoleComponent } from './server-console/server-console.component';

@Component({
  standalone: true,
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css'],
  imports: [TabViewModule, AuditLogComponent, ServerConsoleComponent]
})
export class LogsComponent {
  public activeTabIndex: number = 0;
}
