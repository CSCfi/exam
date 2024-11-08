// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

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
            translate.instant('i18n_confirm_exit'),
            translate.instant('i18n_unsaved_question_data'),
        );
    }
};
