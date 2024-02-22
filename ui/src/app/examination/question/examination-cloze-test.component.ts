/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'xm-examination-cloze-test',
    template: `@if (!isPreview) {
            <div class="row">
                <div class="col-md-12">
                    @if (sq.autosaved) {
                        <small class="autosave-text">
                            {{ 'i18n_autosaved' | translate }}:&nbsp;{{ sq.autosaved | date: 'HH:mm' }}
                        </small>
                    } @else {
                        <small class="autosave-text"> &nbsp; </small>
                    }
                </div>
            </div>
        }
        <div class="row">
            <div class="col-12">{{ sq.derivedMaxScore }} {{ 'i18n_unit_points' | translate }}</div>
        </div>
        <div class="row mt-2">
            <div class="col-md-12">
                <button (click)="saveAnswer()" [disabled]="isPreview" class="pointer btn btn-success">
                    {{ 'i18n_save' | translate }}
                </button>
            </div>
        </div>`,
    standalone: true,
    imports: [DatePipe, TranslateModule],
})
export class ExaminationClozeTestComponent {
    @Input() sq!: ExaminationQuestion;
    @Input() examHash = '';
    @Input() isPreview = false;

    constructor(private Examination: ExaminationService) {}

    saveAnswer = () => this.Examination.saveTextualAnswer$(this.sq, this.examHash, false, false).subscribe();
}
