export class BubblechartConfig {
  colors: Array<string>;
  constructor(colors: Array<string>) {
    this.colors = colors || [];
  }
}