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
import { NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamParticipation } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import type { Examination } from '../../../examination/examination.model';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborative-assessment.service';

@Component({
    selector: 'xm-r-toolbar',
    template: `<!-- Buttons -->
        <div class="review-toolbar-wrapper pt-4 padl0 padr0 marb20 me-4 float-end">
            <div class="review-attachment-button exam-questions-buttons marl15">
                <a
                    class="pointer preview"
                    [routerLink]="getExitState().fragments"
                    [queryParams]="getExitState().params"
                    [hidden]="(!isReadOnly() && isOwnerOrAdmin()) || (!isReadOnly() && !isGraded())"
                >
                    {{ 'sitnet_close' | translate }}
                </a>
            </div>

            <div [hidden]="isReadOnly()" class="review-attachment-button exam-questions-buttons">
                <button
                    class="pointer warning-filled"
                    *ngIf="isMaturityRejection()"
                    [disabled]="!isOwnerOrAdmin() || !valid"
                    (click)="rejectMaturity()"
                >
                    {{ 'sitnet_reject_maturity' | translate }}
                </button>
            </div>

            <div [hidden]="isReadOnly()" class="review-attachment-button exam-questions-buttons marl10">
                <button
                    class="pointer"
                    [disabled]="isReadOnly()"
                    (click)="saveAssessment()"
                    ngbPopover="{{ 'sitnet_save_changes_popover_info' | translate }}"
                    triggers="mouseenter:mouseleave"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                >
                    {{ 'sitnet_save_changes' | translate }}
                </button>
            </div>
            <div [hidden]="isReadOnly()" class="review-attachment-button exam-questions-buttons marl10 mart40">
                <span
                    class="disabled-button-popover-wrapper"
                    ngbPopover="{{ 'sitnet_send_result_to_registry_popover_info' | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <button
                        class="pointer"
                        *ngIf="!isMaturityRejection()"
                        [disabled]="!isOwnerOrAdmin() || !valid"
                        (click)="createExamRecord()"
                    >
                        {{ 'sitnet_send_result_to_registry' | translate }}
                    </button>
                </span>
            </div>
        </div> `,
    standalone: true,
    imports: [RouterLink, NgIf, NgbPopover, TranslateModule],
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
                    this.toast.info(this.translate.instant('sitnet_review_recorded'));
                    const state = this.getExitState();
                    this.router.navigate(state.fragments, { queryParams: state.params });
                });
            });
        }
    };

    rejectMaturity = () =>
        this.Assessment.rejectMaturity$(this.exam).subscribe(() => {
            this.toast.info(this.translate.instant('sitnet_maturity_rejected'));
            const state = this.getExitState();
            this.router.navigate(state.fragments, { queryParams: state.params });
        });

    getExitState = () => this.Assessment.getExitState(this.exam, this.collaborative);
}
