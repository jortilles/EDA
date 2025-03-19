export class SunburstConfig {
  colors: Array<string>;
  assignedColors: any[];
  constructor(colors: Array<string>, assignedColors: any[]) {
    this.colors = colors;
    this.assignedColors = assignedColors || [];
  }
}