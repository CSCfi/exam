// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

@Injectable({ providedIn: 'root' })
export class ExamSectionService {
    private Http = inject(HttpClient);
    private Dialogs = inject(ConfirmationDialogService);
    private Translate = inject(TranslateService);

    clearAllQuestions$ = (examId: number, sectionId: number, collaborative = false) =>
        this.Dialogs.open$(
            this.Translate.instant('i18n_confirm'),
            this.Translate.instant('i18n_remove_all_questions'),
        ).pipe(
            switchMap(() =>
                this.Http.delete<void>(
                    this.getResource(`/app/exams/${examId}/sections/${sectionId}/questions`, collaborative),
                ),
            ),
        );

    moveQuestion$ = (from: number, to: number, examId: number, sectionId: number, collaborative = false) =>
        this.Http.put(this.getResource(`/app/exams/${examId}/sections/${sectionId}/reorder`, collaborative), {
            from: from,
            to: to,
        });

    private getResource = (url: string, collaborative: boolean) =>
        collaborative ? url.replace('/app/exams/', '/app/iop/exams/') : url;
}
