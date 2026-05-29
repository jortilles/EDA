export class DynamicTextConfig {
  color: any;
  modifiedFontPoints: number;
  constructor(color: any, modifiedFontPoints: number = 0) {
    this.color = color;
    this.modifiedFontPoints = modifiedFontPoints;
  }
}