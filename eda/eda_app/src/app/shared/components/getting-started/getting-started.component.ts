import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { UserService } from '@eda/services/api/user.service';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';

@Component({
  selector: 'eda-getting-started',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './getting-started.component.html',
  styleUrls: ['./getting-started.component.css']
})
export class GettingStartedComponent {
  private userService = inject(UserService);
  private createDashboardService = inject(CreateDashboardService);
  private router = inject(Router);
  private _sanitizer = inject(DomSanitizer);

  public readonly datamodel: string = "https://www.youtube.com/embed/Px709s0ftiI";
  public readonly report: string = "https://www.youtube.com/embed/RFznLe9kxHU";

  public datamodelSafe: SafeResourceUrl = this._sanitizer.bypassSecurityTrustResourceUrl(this.datamodel);
  public reportSafe: SafeResourceUrl = this._sanitizer.bypassSecurityTrustResourceUrl(this.report);

  get canCreateDatasource(): boolean {
    return this.userService.isAdmin || this.userService.isDataSourceCreator;
  }

  get canCreateReport(): boolean {
    return localStorage.getItem('isObserver') !== 'true';
  }

  onCreateDashboard(): void {
    this.createDashboardService.open();
  }

  goToResources(): void {
    const scroll = () => document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' });

    if (this.router.url.startsWith('/about')) {
      scroll();
    } else {
      this.router.navigate(['/about']).then(() => setTimeout(scroll, 100));
    }
  }
}
