import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class IconService {
  private icons = {
    "home": `
      <svg viewBox="0 0 23 24" xmlns="http://www.w3.org/2000/svg"><g style="stroke:currentColor;stroke-width:2;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round" transform="translate(1.9589 1)"><path d="m0 22v-12.14758004l10-9.85241996 10 9.85241996v12.14758004"/><path d="m6.73301373 22v-8h6.26698627v8"/></g></svg>
    `,
    "plus": `
      <svg viewBox="0 0 14 13" xmlns="http://www.w3.org/2000/svg">
        <g style="stroke:currentColor;stroke-width:2;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round"><path d="m7.4589 1v11"/><path d="m1.9589 6.5h11"/></g>
      </svg>
    `,
    "molecula": `
      <svg viewBox="0 0 30 32" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="2" transform="translate(1.9051 1.0108)">
          <circle cx="16" cy="12" r="5.268817"/><circle cx="15.5" cy="25.5" r="3.5"/><circle cx="3" cy="12" r="3"/>
          <circle cx="8" cy="2" r="2"/><circle cx="24" cy="21" r="2"/><circle cx="25" cy="2" r="2"/>
          <path d="m23.842583 3.396382-4.19223 4.642706"/><path d="m11.053763 11.989247-5.290847-.011726"/>
          <path d="m15.762916 22v-4.022479"/>
          <path d="m23.0537634 19.9892473-3.4575247-4.1984229m-6.7521299-8.19901491-3.79034536-4.60256218"/>
        </g>
      </svg>
    `,
    "circle-stack": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    `,
    "settings": `
      <svg viewBox="0 0 24 23" xmlns="http://www.w3.org/2000/svg">
        <g style="stroke:currentColor;stroke-width:2;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round"
          transform="translate(1.9589 1)">
          <path d="m18.0607292 8.3125 2.3136458.6890625c.3711458.11010417.625625.45135417.625625.83854167v1.31979163c0 .3871875-.2544792.7284375-.625625.8385417l-2.3136458.6890625c-.1640625.5672917-.3857292 1.1083333-.6657292 1.6151042l1.1469792 2.1204166c.1844791.3397917.1232291.76125-.1509375 1.0346875l-.9333334.9333334c-.2734375.2741666-.6948958.3354166-1.0346875.1509375l-2.1204166-1.1469792c-.5067709.28-1.0478125.5016667-1.6151042.6657292l-.6890625 2.3136458c-.1101042.3711458-.4513542.625625-.8385417.625625h-1.31979163c-.3871875 0-.7284375-.2544792-.83854167-.625625l-.6890625-2.3136458c-.56729167-.1640625-1.10833333-.3857292-1.61510417-.6657292l-2.12041666 1.1469792c-.33979167.1844791-.76125.1232291-1.0346875-.1509375l-.93333334-.9333334c-.27416666-.2734375-.33541666-.6948958-.1509375-1.0346875l1.14697917-2.1204166c-.28-.5067709-.47979167-1.0828125-.66572917-1.6151042l-2.31364583-.6890625c-.37114583-.1101042-.625625-.4513542-.625625-.8385417v-1.31979163c0-.3871875.25447917-.7284375.625625-.83854167l2.31364583-.6890625c.1640625-.56729167.38572917-1.10833333.66572917-1.61510417l-1.14697917-2.12041666c-.18447916-.33979167-.12322916-.76125.1509375-1.0346875l.93333334-.93333334c.2734375-.27416666.69489583-.33541666 1.0346875-.1509375l2.12041666 1.14697917c.50677084-.28 1.0478125-.50166667 1.61510417-.66572917l.6890625-2.31364583c.11010417-.37114583.45135417-.625625.83854167-.625625h1.31979163c.3871875 0 .7284375.25447917.8385417.625625l.6890625 2.31364583c.5672917.1640625 1.1083333.38572917 1.6151042.66572917l2.1204166-1.14697917c.3397917-.18447916.76125-.12322916 1.0346875.1509375l.9333334.93333334c.2741666.2734375.3354166.69489583.1509375 1.0346875l-1.1469792 2.12041666c.28.50677084.5016667 1.0478125.6657292 1.61510417z" />
          <path d="m14.875 10.5c0-2.41645833-1.9585417-4.375-4.375-4.375-2.41645833 0-4.375 1.95854167-4.375 4.375 0 2.4164583 1.95854167 4.375 4.375 4.375 2.4164583 0 4.375-1.9585417 4.375-4.375z" />
        </g>
      </svg>
    `,
    "global": `
      <svg viewBox="0 0 23 22" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="2">
          <circle cx="11.9589" cy="11" r="10" />
          <circle cx="11.9589" cy="11" r="5" />
          <path d="m15.305533 14.565892 3.589018 3.589017" />
          <path d="m5.305533 3.565892 3.589017 3.589017" />
          <path d="m15.805533 7.654909 3.589018-3.589017" />
          <path d="m4.805533 17.654909 3.589017-3.589017" />
        </g>
      </svg>
    `,
    "logout": `
      <svg viewBox="0 0 21 15" xmlns="http://www.w3.org/2000/svg">
        <g style="stroke:currentColor;stroke-width:2;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round"
          transform="translate(1.9589 1)">
          <path d="m4.28277328 13h-4.28277328v-13h4.28277328" />
          <path d="m12.3795763 1.5 5 5-5 5" />
          <path d="m17.379576 6.5h-12.609774" />
        </g>
      </svg>
    `,
    "mail": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    `,
    "arrowRight": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    `,
    "pencil": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
      </svg>
    `,
    "document-duplicated": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
      </svg>
    `,
    "bin": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    `,
    "magnifying-glass": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    `,
    "chevron-right": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    `,
    "chevron-left": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    `,
    "calendar": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    `,
    "text": `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
        <text x="4" y="22" font-family="Times New Roman, serif" font-size="24" font-weight="normal" fill="none">T</text>
      </svg>
    `,
    "hashtag": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
      </svg>
    `,
    "profile": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    `,
    "cat-flag": `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        [attr.class]="className"
        fill="none"
      >
        <rect x="2" y="6" width="20" height="12" fill="#FCDD09" />
        <path d="M2 7H22M2 9H22M2 11H22M2 13H22M2 15H22M2 17H22" stroke="#DA121A" stroke-width="0.5" />
      </svg>
    `,
    "en-flag": `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        [attr.class]="className"
        fill="none"
      >
        <rect x="2" y="6" width="20" height="12" fill="#012169" />
        <path d="M2 6L22 18M22 6L2 18" stroke="white" stroke-width="2" />
        <path d="M2 6L22 18M22 6L2 18" stroke="#C8102E" stroke-width="1" />
        <path d="M12 6V18M2 12H22" stroke="white" stroke-width="3" />
        <path d="M12 6V18M2 12H22" stroke="#C8102E" stroke-width="1.5" />
      </svg>
    `,
    "es-flag": `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        [attr.class]="className"
        fill="none"
      >
        <rect x="2" y="6" width="20" height="12" fill="#C60B1E" />
        <rect x="2" y="9" width="20" height="6" fill="#FFC400" />
      </svg>
    `,
    "pl-flag": `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        [attr.class]="className"
        fill="none"
      >
        <rect x="2" y="6" width="20" height="6" fill="#FFFFFF" />
        <rect x="2" y="12" width="20" height="6" fill="#DC143C" />
      </svg>
    `,
    "users": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    `,
    "rectangle-group": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
      </svg>
    `,
    "arrow-down-on-square-stack": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
      </svg>
    `,
    "at-symbol": `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
      </svg>
    `

  };

  getIcon(name: string): string {
    return this.icons[name as keyof typeof this.icons] || '';
  }
}