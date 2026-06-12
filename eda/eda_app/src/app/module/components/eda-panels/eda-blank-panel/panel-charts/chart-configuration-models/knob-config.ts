export class KnobConfig {
  color: string;
  limits: Array<any>;
  semaphoreColor: boolean;

  constructor(color: string, limits: Array<any>, semaphoreColor: boolean = false) {
    this.color = color;
    this.limits = limits;
    this.semaphoreColor = semaphoreColor;
  }
}