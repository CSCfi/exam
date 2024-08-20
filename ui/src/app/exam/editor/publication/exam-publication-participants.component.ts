// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Exam } from 'src/app/exam/exam.model';
import { CollaborativeExamOwnerSelectorComponent } from './collaborative-exam-owner-picker.component';
import { ExamParticipantSelectorComponent } from './exam-participant-picker.component';
import { ExamPreParticipantSelectorComponent } from './exam-pre-participant-picker.component';
import { OrganisationSelectorComponent } from './organisation-picker.component';

@Component({
    standalone: true,
    imports: [
        FormsModule,
        NgbPopoverModule,
        TranslateModule,
        ExamParticipantSelectorComponent,
        ExamPreParticipantSelectorComponent,
        CollaborativeExamOwnerSelectorComponent,
        OrganisationSelectorComponent,
    ],
    selector: 'xm-exam-publication-participants',
    template: `
        @if (!collaborative()) {
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_exam_add_participants_title' | translate }}
                </div>
                <div class="col-md-9 participant-selector-toggle">
                    <label>
                        <input
                            type="radio"
                            [ngModel]="visibleParticipantSelector()"
                            (ngModelChange)="visibleParticipantSelector.set($event)"
                            value="participant"
                        />
                        {{ 'i18n_exam_participant_selector_label' | translate }}
                        <sup
                            ngbPopover="{{ 'i18n_exam_participants_description' | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                            triggers="mouseenter:mouseleave"
                            ><img src="/assets/images/icon_tooltip.svg" alt=""
                        /></sup>
                    </label>
                    <label class="ms-2">
                        <input
                            type="radio"
                            [ngModel]="visibleParticipantSelector()"
                            (ngModelChange)="visibleParticipantSelector.set($event)"
                            value="pre-participant"
                        />
                        {{ 'i18n_exam_pre_participant_selector_label' | translate }}
                        <sup
                            ngbPopover="{{ 'i18n_exam_pre_participants_description' | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                            triggers="mouseenter:mouseleave"
                            ><img src="/assets/images/icon_tooltip.svg" alt=""
                        /></sup>
                    </label>
                </div>
            </div>
        }
        <!-- Exam participants -->
        @if (visibleParticipantSelector() === 'participant') {
            <xm-exam-participant-selector [exam]="exam()"></xm-exam-participant-selector>
        }

        <!-- Exam pre-participants -->
        @if (visibleParticipantSelector() === 'pre-participant') {
            <xm-exam-pre-participant-selector [exam]="exam()"></xm-exam-pre-participant-selector>
        }

        @if (collaborative()) {
            <xm-collaborative-exam-owner-selector [exam]="exam()"> </xm-collaborative-exam-owner-selector>
            <xm-exam-organisation-selector [exam]="exam()"></xm-exam-organisation-selector>
        }
    `,
})
export class ExamPublicationParticipantsComponent {
    collaborative = input(false);
    exam = input.required<Exam>();
    visibleParticipantSelector = signal('participant');
}
