// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, input, output, signal } from '@angular/core';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { CollaborativeExamOwnerSelectorComponent } from './collaborative-exam-owner-picker.component';
import { ExamParticipantSelectorComponent } from './exam-participant-picker.component';
import { ExamPreParticipantSelectorComponent } from './exam-pre-participant-picker.component';
import { OrganisationSelectorComponent } from './organisation-picker.component';

@Component({
    imports: [
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
            <div class="xm-form-row">
                <span>{{ 'i18n_exam_add_participants_title' | translate }}</span>
                <div class="xm-cluster xm-gap-3">
                    <label>
                        <input
                            type="radio"
                            [checked]="visibleParticipantSelector() === 'participant'"
                            (change)="visibleParticipantSelector.set('participant')"
                        />
                        {{ 'i18n_exam_participant_selector_label' | translate }}
                        <sup
                            ngbPopover="{{ 'i18n_exam_participants_description' | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                            triggers="mouseenter:mouseleave"
                            ><img src="/assets/images/icon_tooltip.svg" alt=""
                        /></sup>
                    </label>
                    <label>
                        <input
                            type="radio"
                            [checked]="visibleParticipantSelector() === 'pre-participant'"
                            (change)="visibleParticipantSelector.set('pre-participant')"
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
                <!-- Exam participants -->
                @if (visibleParticipantSelector() === 'participant') {
                    <xm-exam-participant-selector
                        [exam]="exam()"
                        (participantsChange)="participantsChanged($event)"
                    ></xm-exam-participant-selector>
                }
                <!-- Exam pre-participants -->
                @if (visibleParticipantSelector() === 'pre-participant') {
                    <xm-exam-pre-participant-selector
                        [exam]="exam()"
                        (participantsChange)="participantsChanged($event)"
                    ></xm-exam-pre-participant-selector>
                }
            </div>
        }
        @if (collaborative()) {
            <div class="xm-stack">
                <xm-collaborative-exam-owner-selector [exam]="exam()"> </xm-collaborative-exam-owner-selector>
                <xm-exam-organisation-selector [exam]="exam()"></xm-exam-organisation-selector>
            </div>
        }
    `,
})
export class ExamPublicationParticipantsComponent {
    readonly collaborative = input(false);
    readonly exam = input.required<Exam>();
    readonly participantsChange = output<ExamEnrolment[]>();
    readonly visibleParticipantSelector = signal('participant');

    participantsChanged(event: ExamEnrolment[]) {
        this.participantsChange.emit(event);
    }
}
