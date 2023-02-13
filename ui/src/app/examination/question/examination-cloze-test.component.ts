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
import { Component, Input } from '@angular/core';
import type { ExaminationQuestion } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'xm-examination-cloze-test',
    template: `<div class="row">
            <div class="col-md-12">
                <small class="sitnet-info-text" *ngIf="sq.autosaved">
                    {{ 'sitnet_autosaved' | translate }}:&nbsp;{{ sq.autosaved | date : 'HH:mm' }}
                </small>
                <small class="sitnet-info-text" *ngIf="!sq.autosaved"> &nbsp; </small>
            </div>
        </div>
        <div class="padl0 question-type-text">
            <span *ngIf="sq.evaluationType === 'Selection'">
                {{ 'sitnet_evaluation_select' | translate }}
            </span>
            <span *ngIf="sq.evaluationType !== 'Selection'">
                {{ sq.derivedMaxScore }} {{ 'sitnet_unit_points' | translate }}
            </span>
        </div>
        <div class="row top-margin-1">
            <div class="col-md-12">
                <button (click)="saveAnswer()" class="green_button">{{ 'sitnet_save' | translate }}</button>
            </div>
        </div> `,
})
export class ExaminationClozeTestComponent {
    @Input() sq!: ExaminationQuestion;
    @Input() examHash = '';

    constructor(private Examination: ExaminationService) {}

    saveAnswer = () => this.Examination.saveTextualAnswer$(this.sq, this.examHash, false, false).subscribe();
}
