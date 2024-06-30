import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import {DEFAULT_BACKGROUND_COLOR, DEFAULT_PANEL_COLOR, DEFAULT_FONT_COLOR, DEFAULT_FONT_FAMILY,DEFAULT_FONT_SIZE, DEFAULT_TITLE_ALIGN,DEFAULT_PANEL_TITLE_ALIGN  } from  "../../config/personalitzacio/customizables";


export interface StyleConfig {
	fontFamily: string,
	fontSize: number,
	fontColor: string
}

export interface DashboardStyles {
	backgroundColor: string;
	panelColor: string;
	titleAlign: string;
	panelTitleAlign: string;
	customCss: string;
	title: StyleConfig;
	filters: StyleConfig;
	panelTitle: StyleConfig;
	panelContent: StyleConfig;
}


@Injectable()
export class StyleProviderService {


	public DEFAULT_BACKGROUND_COLOR: string = DEFAULT_BACKGROUND_COLOR;
	public DEFAULT_PANEL_COLOR: string = DEFAULT_PANEL_COLOR;
	public DEFAULT_FONT_COLOR: string = DEFAULT_FONT_COLOR;
	public DEFAULT_FONT_FAMILY: string = DEFAULT_FONT_FAMILY;
	public DEFAULT_FONT_SIZE: number = DEFAULT_FONT_SIZE;
	public DEFAULT_TITLE_ALIGN: string = DEFAULT_TITLE_ALIGN;
	public DEFAULT_PANEL_TITLE_ALIGN: string = DEFAULT_PANEL_TITLE_ALIGN;

	public DEFAULT_CUSTOM_CSS: string = '';
	

	/**Page background */
	private _pageBackground = new BehaviorSubject<string>(this.DEFAULT_BACKGROUND_COLOR);
	public pageBackground = this._pageBackground.asObservable();

	/**Panel background */
	private _panelColor = new BehaviorSubject<string>(this.DEFAULT_PANEL_COLOR);
	public panelColor = this._panelColor.asObservable();

	/**Title align */
	private _titleAlign = new BehaviorSubject<string>(this.DEFAULT_TITLE_ALIGN);
	public titleAlign = this._titleAlign.asObservable();

	/**Panel title align */
	private _panelTitleAlign = new BehaviorSubject<string>(this.DEFAULT_PANEL_TITLE_ALIGN);
	public panelTitleAlign = this._panelTitleAlign.asObservable();

	/**Title Font style */
	private _titleFontFamily = new BehaviorSubject<string>(this.DEFAULT_FONT_FAMILY);
	public titleFontFamily = this._titleFontFamily.asObservable();

	private _titleFontSize = new BehaviorSubject<number>(this.DEFAULT_FONT_SIZE);
	public titleFontSize = this._titleFontSize.asObservable();

	private _titleFontColor = new BehaviorSubject<string>(this.DEFAULT_FONT_COLOR);
	public titleFontColor = this._titleFontColor.asObservable();

	/**Filters Font style */
	private _filtersFontFamily = new BehaviorSubject<string>(this.DEFAULT_FONT_FAMILY);
	public filtersFontFamily = this._filtersFontFamily.asObservable();

	private _filtersFontSize = new BehaviorSubject<number>(this.DEFAULT_FONT_SIZE);
	public filtersFontSize = this._filtersFontSize.asObservable();

	private _filtersFontColor = new BehaviorSubject<string>(this.DEFAULT_FONT_COLOR);
	public filtersFontColor = this._filtersFontColor.asObservable();

	/**Panel Font style */
	private _panelTitleFontFamily = new BehaviorSubject<string>(this.DEFAULT_FONT_FAMILY);
	public panelTitleFontFamily = this._panelTitleFontFamily.asObservable();

	private _panelTitleFontSize = new BehaviorSubject<number>(this.DEFAULT_FONT_SIZE);
	public panelTitleFontSize = this._panelTitleFontSize.asObservable();

	private _panelTitleFontColor = new BehaviorSubject<string>(this.DEFAULT_FONT_COLOR);
	public panelTitleFontColor = this._panelTitleFontColor.asObservable();

	/**Content Font style */
	private _panelFontFamily = new BehaviorSubject<string>(this.DEFAULT_FONT_FAMILY);
	public panelFontFamily = this._panelFontFamily.asObservable();

	private _panelFontSize = new BehaviorSubject<number>(this.DEFAULT_FONT_SIZE);
	public panelFontSize = this._panelFontSize.asObservable();

	private _panelFontColor = new BehaviorSubject<string>(this.DEFAULT_FONT_COLOR);
	public panelFontColor = this._panelFontColor.asObservable();

	private _customCss = new BehaviorSubject<string>(this.DEFAULT_CUSTOM_CSS);
	public customCss = this._customCss.asObservable();

	constructor() {
	}

	public setDefaultBackgroundColor() {
		this._pageBackground.next(this.DEFAULT_BACKGROUND_COLOR);
	}

	public setStyles(styles: DashboardStyles) {

		this._pageBackground.next(styles.backgroundColor);
		this._panelColor.next(styles.panelColor);

		/**Title */
		this._titleFontFamily.next(styles.title.fontFamily);
		this._titleFontColor.next(styles.title.fontColor);
		this._titleFontSize.next(styles.title.fontSize);
		this._titleAlign.next(styles.titleAlign);

		/**Filters */
		this._filtersFontFamily.next(styles.filters.fontFamily);
		this._filtersFontColor.next(styles.filters.fontColor);
		this._filtersFontSize.next(styles.filters.fontSize);

		/**Panel */
		this._panelTitleFontFamily.next(styles.panelTitle.fontFamily);
		this._panelTitleFontColor.next(styles.panelTitle.fontColor);
		this._panelTitleFontSize.next(styles.panelTitle.fontSize);
		this._panelTitleAlign.next(styles.panelTitleAlign);

		/**Content */
		this._panelFontColor.next(styles.panelContent.fontColor);
		this._panelFontFamily.next(styles.panelContent.fontFamily);
		this._panelFontSize.next(styles.panelContent.fontSize);

		this._customCss.next(styles.customCss);
		// this._fontSize.next(styles.fontSize);
	}

	public setTitleFontSize = (size: number) => {
		document.documentElement.style.setProperty('--eda-title-small', `${1.7 + size / 10}rem`);
		document.documentElement.style.setProperty('--eda-title-big', `${1.8 + size / 10}rem`);
	}

	public setfiltersFontSize = (size: number) => {
		document.documentElement.style.setProperty('--eda-filters-small', `${1 + size / 10}rem`);
		document.documentElement.style.setProperty('--eda-filters-big', `${1.1 + size / 10}rem`);
	}

	public setPanelTitleFontSize = (size: number) => {
		document.documentElement.style.setProperty('--eda-panel-title-small', `${1.1 + size / 10}rem`);
		document.documentElement.style.setProperty('--eda-panel-title-big', `${1.2 + size / 10}rem`);
	}

	public setPanelContentFontSize = (size: number) => {
		document.documentElement.style.setProperty('--panel-small', `${0.9 + size / 10}rem`);
		document.documentElement.style.setProperty('--panel-big', `${1 + size / 10}rem`);
	}

	public setCustomCss = (css: string) => {
		let styleElement = document.getElementById('dashboardCustomCss');
		if (styleElement) {
			styleElement.innerHTML = css;
		} else {
			styleElement = document.createElement('style');
			styleElement.id = 'dashboardCustomCss';
			styleElement.innerHTML = css;

			const headElement = document.head || document.getElementsByTagName('head')[0];
			headElement.appendChild(styleElement);
		}

	}

	public generateDefaultStyles(): DashboardStyles {

		const styles: DashboardStyles = {
			backgroundColor: this.DEFAULT_BACKGROUND_COLOR,
			panelColor: this.DEFAULT_PANEL_COLOR,
			titleAlign: this.DEFAULT_TITLE_ALIGN,
			panelTitleAlign: this.DEFAULT_PANEL_TITLE_ALIGN,
			customCss: this.DEFAULT_CUSTOM_CSS,
			title: {
				fontFamily: this.DEFAULT_FONT_FAMILY,
				fontSize: this.DEFAULT_FONT_SIZE,
				fontColor: this.DEFAULT_FONT_COLOR
			},
			filters: {
				fontFamily: this.DEFAULT_FONT_FAMILY,
				fontSize: this.DEFAULT_FONT_SIZE,
				fontColor: this.DEFAULT_FONT_COLOR
			},
			panelTitle: {
				fontFamily: this.DEFAULT_FONT_FAMILY,
				fontSize: this.DEFAULT_FONT_SIZE,
				fontColor: this.DEFAULT_FONT_COLOR
			},
			panelContent: {
				fontFamily: this.DEFAULT_FONT_FAMILY,
				fontSize: this.DEFAULT_FONT_SIZE,
				fontColor: this.DEFAULT_FONT_COLOR
			},
		}

		return styles
	}

}