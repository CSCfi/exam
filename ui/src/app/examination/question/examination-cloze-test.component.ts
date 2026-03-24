// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

@Component({
    selector: 'xm-examination-cloze-test',
    template: `@if (!isPreview()) {
            <div class="row">
                <div class="col-md-12">
                    @if (autosaved()) {
                        <small class="autosave-text">
                            {{ 'i18n_autosaved' | translate }}:&nbsp;{{ autosaved() | date: 'HH:mm' }}
                        </small>
                    } @else {
                        <small class="autosave-text"> &nbsp; </small>
                    }
                </div>
            </div>
        }
        <div class="row">
            <div class="col-md-3 question-type-text">
                {{ sq().derivedMaxScore }} {{ 'i18n_unit_points' | translate }}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-12">
                <button (click)="saveAnswer()" [disabled]="isPreview()" class="pointer btn btn-success">
                    {{ 'i18n_save' | translate }}
                </button>
            </div>
        </div>`,
    imports: [DatePipe, TranslateModule],
    styleUrls: ['./question.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationClozeTestComponent {
    readonly sq = input.required<ExaminationQuestion>();
    readonly examHash = input('');
    readonly isPreview = input(false);
    readonly isExternal = input(false);

    readonly autosaved = signal<Date | undefined>(undefined);

    private readonly Examination = inject(ExaminationService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        const autosaveInterval = window.setInterval(() => {
            const sq = this.sq();
            if (this.isPreview() || !sq.clozeTestAnswer?.answer) return;
            this.Examination.saveTextualAnswer$(sq, this.examHash(), {
                autosave: true,
                canFail: true,
                external: this.isExternal(),
            }).subscribe({ next: () => this.autosaved.set(new Date()) });
        }, 60 * 1000);
        this.destroyRef.onDestroy(() => window.clearInterval(autosaveInterval));
    }

    saveAnswer() {
        this.Examination.saveTextualAnswer$(this.sq(), this.examHash(), {
            autosave: false,
            canFail: false,
            external: this.isExternal(),
        }).subscribe();
    }
}
