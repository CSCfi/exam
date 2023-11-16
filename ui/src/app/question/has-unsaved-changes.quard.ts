import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ConfirmationDialogService } from '../shared/dialogs/confirmation-dialog.service';

export interface CanComponentDeactivate {
    canDeactivate: () => boolean;
}

export const hasUnsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (
    component: CanComponentDeactivate,
): Observable<boolean> => {
    if (component.canDeactivate && component.canDeactivate()) {
        return of(true);
    } else {
        const translate = inject(TranslateService);
        return inject(ConfirmationDialogService).open$(
            translate.instant('sitnet_confirm_exit'),
            translate.instant('sitnet_unsaved_question_data'),
        );
    }
};
