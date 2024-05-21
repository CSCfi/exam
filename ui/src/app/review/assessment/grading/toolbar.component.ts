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

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamParticipation } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { Examination } from 'src/app/examination/examination.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CollaborativeAssesmentService } from 'src/app/review/assessment/collaborative-assessment.service';

@Component({
    selector: 'xm-r-toolbar',
    template: `<!-- Buttons -->
        <div class="pt-4 ps-0 pe-0 mt-2">
            <div class="d-flex flex-row-reverse">
                <div [hidden]="isReadOnly()" class="ms-2">
                    <span
                        class="disabled-button-popover-wrapper"
                        ngbPopover="{{ 'i18n_send_result_to_registry_popover_info' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        @if (!isMaturityRejection()) {
                            <button
                                class="xm-ok-button"
                                [disabled]="!isOwnerOrAdmin() || !valid"
                                (click)="createExamRecord()"
                            >
                                {{ 'i18n_send_result_to_registry' | translate }}
                            </button>
                        }
                    </span>
                </div>
                <div [hidden]="isReadOnly()" class="ms-2">
                    <button
                        class="xm-ok-button"
                        [disabled]="isReadOnly()"
                        (click)="saveAssessment()"
                        ngbPopover="{{ 'i18n_save_changes_popover_info' | translate }}"
                        triggers="mouseenter:mouseleave"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                    >
                        {{ 'i18n_save_changes' | translate }}
                    </button>
                </div>
                <div [hidden]="isReadOnly()">
                    @if (isMaturityRejection()) {
                        <button
                            class="xm-warning-button ms-2"
                            [disabled]="!isOwnerOrAdmin() || !valid"
                            (click)="rejectMaturity()"
                        >
                            {{ 'i18n_reject_maturity' | translate }}
                        </button>
                    }
                </div>
                <button
                    class="xm-cancel-button ms-2"
                    [routerLink]="getExitState().fragments"
                    [queryParams]="getExitState().params"
                    [hidden]="(!isReadOnly() && isOwnerOrAdmin()) || (!isReadOnly() && !isGraded())"
                >
                    {{ 'i18n_close' | translate }}
                </button>
            </div>
        </div>`,
    standalone: true,
    imports: [RouterLink, NgbPopover, TranslateModule],
})
export class ToolbarComponent implements OnInit {
    @Input() valid = false;
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;
    @Input() exam!: Examination;

    id = 0;
    ref = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Exam: ExamService,
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
    }

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam, this.collaborative);
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);
    isGraded = () => this.Assessment.isGraded(this.exam);
    isMaturityRejection = () =>
        this.exam?.executionType.type === 'MATURITY' &&
        !this.exam.subjectToLanguageInspection &&
        this.exam.grade &&
        this.exam.grade.marksRejection;

    saveAssessment = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.saveAssessment(this.participation, this.isOwnerOrAdmin(), this.id, this.ref);
        } else {
            this.Assessment.saveAssessment(this.exam, this.isOwnerOrAdmin());
        }
    };

    createExamRecord = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.createExamRecord(this.participation, this.id, this.ref);
        } else {
            this.Assessment.doesPreviouslyLockedAssessmentsExist$(this.exam).subscribe((setting) => {
                this.Assessment.createExamRecord$(this.exam, true, setting.status === 'everything').subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_review_recorded'));
                    const state = this.getExitState();
                    this.router.navigate(state.fragments, { queryParams: state.params });
                });
            });
        }
    };

    rejectMaturity = () =>
        this.Assessment.rejectMaturity$(this.exam).subscribe(() => {
            this.toast.info(this.translate.instant('i18n_maturity_rejected'));
            const state = this.getExitState();
            this.router.navigate(state.fragments, { queryParams: state.params });
        });

    getExitState = () => this.Assessment.getExitState(this.exam, this.collaborative);
}
