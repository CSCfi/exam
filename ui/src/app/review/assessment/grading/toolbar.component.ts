// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { Examination } from 'src/app/examination/examination.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CollaborativeAssesmentService } from 'src/app/review/assessment/collaborative-assessment.service';

@Component({
    selector: 'xm-r-toolbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
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
                                class="btn btn-success"
                                [disabled]="!isOwnerOrAdmin() || !valid()"
                                (click)="createExamRecord()"
                            >
                                {{ 'i18n_send_result_to_registry' | translate }}
                            </button>
                        }
                    </span>
                </div>
                <div [hidden]="isReadOnly()" class="ms-2">
                    <button
                        class="btn btn-success"
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
                            class="btn btn-outline-danger ms-2"
                            [disabled]="!isOwnerOrAdmin() || !valid()"
                            (click)="rejectMaturity()"
                        >
                            {{ 'i18n_reject_maturity' | translate }}
                        </button>
                    }
                </div>
                <button
                    class="btn btn-secondary ms-2"
                    [routerLink]="getExitState().fragments"
                    [queryParams]="getExitState().params"
                    [hidden]="(!isReadOnly() && isOwnerOrAdmin()) || (!isReadOnly() && !isGraded())"
                >
                    {{ 'i18n_close' | translate }}
                </button>
            </div>
        </div>`,
    imports: [RouterLink, NgbPopover, TranslateModule],
})
export class ToolbarComponent implements OnInit {
    valid = input(false);
    participation = input.required<ExamParticipation>();
    collaborative = input(false);
    exam = input.required<Examination>();

    id = 0;
    ref = '';

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private Exam = inject(ExamService);

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
    }

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam(), this.collaborative());
    isReadOnly = () => this.Assessment.isReadOnly(this.exam());
    isGraded = () => this.Assessment.isGraded(this.exam());
    isMaturityRejection = () => {
        const examValue = this.exam();
        return (
            examValue?.executionType.type === 'MATURITY' &&
            !examValue.subjectToLanguageInspection &&
            examValue.grade !== undefined &&
            examValue.grade?.marksRejection
        );
    };

    saveAssessment = () => {
        if (this.collaborative()) {
            this.CollaborativeAssessment.saveAssessment(this.participation(), this.isOwnerOrAdmin(), this.id, this.ref);
        } else {
            this.Assessment.saveAssessment(this.exam(), this.isOwnerOrAdmin());
        }
    };

    createExamRecord = () => {
        if (this.collaborative()) {
            this.CollaborativeAssessment.createExamRecord(this.participation(), this.id, this.ref);
        } else {
            const examValue = this.exam();
            this.Assessment.doesPreviouslyLockedAssessmentsExist$(examValue).subscribe((setting) => {
                this.Assessment.createExamRecord$(examValue, true, setting.status === 'everything').subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_review_recorded'));
                    const state = this.getExitState();
                    this.router.navigate(state.fragments, { queryParams: state.params });
                });
            });
        }
    };

    rejectMaturity = () => {
        const examValue = this.exam();
        this.Assessment.rejectMaturity$(examValue).subscribe(() => {
            this.toast.info(this.translate.instant('i18n_maturity_rejected'));
            const state = this.getExitState();
            this.router.navigate(state.fragments, { queryParams: state.params });
        });
    };

    getExitState = () => this.Assessment.getExitState(this.exam(), this.collaborative());
}
