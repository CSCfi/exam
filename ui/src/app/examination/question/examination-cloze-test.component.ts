// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

@Component({
    selector: 'xm-examination-cloze-test',
    template: `@if (!isPreview()) {
            <div class="row">
                <div class="col-md-12">
                    @if (sq().autosaved) {
                        <small class="autosave-text">
                            {{ 'i18n_autosaved' | translate }}:&nbsp;{{ sq().autosaved | date: 'HH:mm' }}
                        </small>
                    } @else {
                        <small class="autosave-text"> &nbsp; </small>
                    }
                </div>
            </div>
        }
        <div class="row">
            <div class="col-12">{{ sq().derivedMaxScore }} {{ 'i18n_unit_points' | translate }}</div>
        </div>
        <div class="row mt-2">
            <div class="col-md-12">
                <button (click)="saveAnswer()" [disabled]="isPreview()" class="pointer btn btn-success">
                    {{ 'i18n_save' | translate }}
                </button>
            </div>
        </div>`,
    imports: [DatePipe, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationClozeTestComponent {
    sq = input.required<ExaminationQuestion>();
    examHash = input('');
    isPreview = input(false);

    private Examination = inject(ExaminationService);

    saveAnswer() {
        this.Examination.saveTextualAnswer$(this.sq(), this.examHash(), false, false).subscribe();
    }
}
