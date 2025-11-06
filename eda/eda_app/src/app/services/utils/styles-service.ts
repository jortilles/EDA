import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})

/**ALl credit and applause to https://thesoftwayfarecoder.com/dynamically-creating-css-classes-in-angular/ */
export class StyleService {
  private _headElement: HTMLHeadElement;
  private get headElement(): HTMLHeadElement {
    if (!this._headElement && document.getElementsByTagName("head").length > 0) {
      this._headElement = document.getElementsByTagName("head")[0];
    }
    return this._headElement;
  }
  private _cssStyleSheet: CSSStyleSheet;
  private get cssStyleSheet(): CSSStyleSheet {
    if (!this._cssStyleSheet) {
      if (!document.styleSheets || this.headElement === null) return null;
      // Get the first style sheet that is enabled and mediaText is empty or screen.
      this._cssStyleSheet = Array.from(document.styleSheets)
        .find(s =>
          !s.disabled &&
          (!s.href || s.href.startsWith(window.location.origin)) &&
          (s.media.mediaText === "" || s.media.mediaText.includes("screen"))
        ) as CSSStyleSheet;
      // If the style sheet doesn't exist yet, then create it.
      if (!this._cssStyleSheet) this._cssStyleSheet = this.createCssStyleSheet();
    }
    return this._cssStyleSheet;
  }
  constructor() {

  }
  public setStyle(selectorText: string, styleName: string, value: string): void {
    let rule: CSSStyleRule = this.getStyleRule(selectorText);
    if (!rule) return;
    rule.style[styleName] = value;
  }
  public setStyles(selectorText: string, styles: { [styleName: string]: string } | CSSStyleDeclaration) {
    let rule: CSSStyleRule = this.getStyleRule(selectorText);
    if (!rule) return;
    Object.keys(styles).forEach(styleName => {

      rule.style[styleName] = `${styles[styleName]}`;

    });
  }
  private createCssStyleSheet(): CSSStyleSheet {
    // Create the style sheet element.
    let styleSheetElement = document.createElement("style");
    styleSheetElement.type = "text/css";
    // Append the style sheet element to the head.
    this.headElement.appendChild(styleSheetElement);
    return styleSheetElement.sheet as CSSStyleSheet;
  }
  private getStyleRule(selectorText: string): CSSStyleRule {
    if (!this.cssStyleSheet) return;
    let rules: CSSRuleList = this.cssStyleSheet.cssRules.length > 0 || this.cssStyleSheet.rules.length == 0 ? this.cssStyleSheet.cssRules : this.cssStyleSheet.rules;
    let rule: CSSStyleRule = Array.from(rules).find(r => r instanceof CSSStyleRule && r.selectorText.toLowerCase() == selectorText.toLowerCase()) as CSSStyleRule;
    // If the selector rule does not exist, create it.
    if (!rule) {
      let ruleIndex = this.cssStyleSheet.insertRule(selectorText + "{ }", rules.length);
      rule = rules[ruleIndex] as CSSStyleRule;
    }
    return rule;
  }
}