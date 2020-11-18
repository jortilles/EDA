export class LinkedDashboardProps{
  sourceCol     : string;
  sourceTable   : string;
  dashboardName : string;
  dashboardID   : string;
  table         : string;
  col           : string;

  constructor (
    sourceCol     : string,
    sourceTable   : string,
    dashboardName : string,
    dashboardID   : string,
    col           : string,
    table         : string
    )
    {
    this.sourceCol      = sourceCol;
    this.sourceTable    = sourceTable;
    this.dashboardName  = dashboardName;
    this.dashboardID    = dashboardID;
    this.col            = col;
    this.table          = table;
  }
}