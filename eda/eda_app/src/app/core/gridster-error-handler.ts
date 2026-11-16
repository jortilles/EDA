import { ErrorHandler, isDevMode } from '@angular/core';

/**
 * angular-gridster2 17.0.0 initialises GridsterItemComponent.resizeEnabled after the
 * first change-detection pass. Angular's dev-mode checkNoChanges then reports a
 * NG0100 for that internal null -> false transition on every dashboard load.
 *
 * It is a third-party, development-only warning with no functional impact, so it is
 * filtered here until angular-gridster2 is upgraded to a version that initialises
 * resizeEnabled before the item template is checked.
 */
export class GridsterErrorHandler implements ErrorHandler {
    handleError(error: any): void {
        const message = String(error?.message ?? error ?? '');
        if (isDevMode() && message.includes('NG0100') && message.includes('_GridsterItemComponent component')) {
            return;
        }
        console.error(error);
    }
}
