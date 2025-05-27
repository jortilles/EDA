import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { EdaColumnContextMenu, EdaColumnText, EdaTable } from "@eda/components/component.index";
import { DashboardService } from "@eda/services/service.index";
import { EdaContextMenu, EdaContextMenuItem } from "@eda/shared/components/shared-components.index";
import { ContextMenu } from "primeng/contextmenu";

@Component({
  selector: 'app-alert-management',
  templateUrl: './alerts-management.component.html',
  styles: []
})

export class AlertsManagementComponent implements OnInit {

  public dashboards: Array<any> = [];
  public alerts: Array<any> = [];
  public alertsTable: EdaTable;
  public panelHeader:string = $localize`:@@alertsConfigTitle:Gestión de alertas`;

  constructor(private dashboardService: DashboardService, private router: Router,) {

    this.alertsTable = new EdaTable({

      contextMenu: new EdaContextMenu( {
        style:{top:'-250px', left:'-500px'},
        contextMenuItems: [

          new EdaContextMenuItem({
            label: $localize`:@@gotodashboard:Ir al informe`, command: () => {
              
              const elem = this.alertsTable.getContextMenuRow().data ;
              this.router.navigate(['/v2/dashboard/', elem._id]);
            }
          })
        ]
      }),
      cols: [
        new EdaColumnContextMenu(),
        new EdaColumnText({ field: 'alerta', header: $localize`:@@alertTable:ALERTA` }),
        new EdaColumnText({ field: 'panel', header: $localize`:@@panelTable:PANEL` }),
        new EdaColumnText({ field: 'dashboard', header: $localize`:@@dashboardTable:INFORME` }),
        new EdaColumnText({ field: 'model', header: $localize`:@@tituloCard:MODELO DE DATOS` }),
      ]
    });


  }
  ngOnInit(): void {
    this.initDashboards();
  }

  private initDashboards(): void {
    this.dashboardService.getDashboards().subscribe(data => {
      let dashboards = [].concat.apply([], [data.dashboards, data.group, data.publics, data.shared]);

      dashboards.forEach(dashboard => {

        this.dashboardService.getDashboard(dashboard._id).subscribe(data => {

          this.dashboards.push(data.dashboard);

          data.dashboard.config.panel.forEach(panel => {

            if (panel.content && panel.content.chart === 'kpi' && panel.content.query.output.config.alertLimits) {

              panel.content.query.output.config.alertLimits.forEach(alert => {

                if (alert.mailing.enabled) {


                  this.alerts.push({ alert: alert, dashboard: dashboard, panel: panel.title, field: panel.content.query.query.fields[0].display_name });
                  this.alertsTable.value.push({
                    alerta: `KPI ${alert.operand} ${alert.value}`,
                    panel: panel.title,
                    dashboard: dashboard.config.title,
                    model:data.datasource.name,
                    data:dashboard
                  })

                }
              });
            }
          })

        })
      })
    })


  }

}