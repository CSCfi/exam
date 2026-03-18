// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Examination, ExaminationSection } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-examination-toolbar',
    templateUrl: './examination-toolbar.component.html',
    styleUrls: ['../examination.shared.scss', './examination-toolbar.component.scss'],
    imports: [NgbPopover, UpperCasePipe, SlicePipe, TranslateModule, OrderByPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationToolbarComponent implements OnInit {
    readonly exam = input.required<Examination>();
    readonly activeSection = input<ExaminationSection | undefined>(undefined);
    readonly isPreview = input(false);
    readonly isCollaborative = input(false);
    readonly pageSelected = output<{ page: { id?: number; type: string } }>();

    readonly room = signal<ExamRoom | undefined>(undefined);
    readonly tab: number;

    readonly sectionAnswerCounts = computed(() => {
        this.Examination.answerStatusVersion();
        return new Map(
            this.exam().examSections.map((s) => [
                s.id,
                {
                    total: s.sectionQuestions.length,
                    answered: s.sectionQuestions.filter(this.Examination.isAnswered).length,
                },
            ]),
        );
    });

    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Confirmation = inject(ConfirmationDialogService);
    private readonly Session = inject(SessionService);
    private readonly Examination = inject(ExaminationService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Enrolment = inject(EnrolmentService);

    constructor() {
        this.tab = this.route.snapshot.queryParams.tab;
    }

    ngOnInit() {
        const currentExam = this.exam();
        const currentIsPreview = this.isPreview();
        if (!currentIsPreview && currentExam.implementation === 'AQUARIUM') {
            this.http
                .get<ExamRoom>('/app/enrolments/room/' + currentExam.hash)
                .subscribe((resp) => this.room.set(resp));
        }
    }

    displayUser() {
        const user = this.Session.getUser();
        if (!user) {
            return;
        }
        const userId = user.userIdentifier ? ' (' + user.userIdentifier + ')' : '';
        return `${user.firstName} ${user.lastName} ${userId}`;
    }

    turnExam() {
        return this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_turn_exam'),
        ).subscribe({
            next: () => {
                const currentExam = this.exam();
                // Save all textual answers regardless of empty or not
                this.Examination.saveAllTextualAnswersOfExam$(currentExam, currentExam.external)
                    .pipe(
                        catchError((err) => {
                            if (err) console.log(err);
                            return of(err);
                        }),
                        finalize(() =>
                            this.Examination.logout('i18n_exam_returned', currentExam.hash, {
                                quitLinkEnabled: currentExam.implementation === 'CLIENT_AUTH',
                                canFail: false,
                                external: currentExam.external,
                            }),
                        ),
                    )
                    .subscribe();
            },
        });
    }

    abortExam() {
        return this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_abort_exam'),
        ).subscribe({
            next: () => {
                const currentExam = this.exam();
                this.Examination.abort$(currentExam.hash, currentExam.external).subscribe({
                    next: () => {
                        this.toast.info(this.translate.instant('i18n_exam_aborted'), undefined, { timeOut: 5000 });
                        this.router.navigate(['/examination/logout'], {
                            queryParams: {
                                reason: 'aborted',
                                quitLinkEnabled: currentExam.implementation === 'CLIENT_AUTH',
                            },
                        });
                    },
                    error: (err) => this.toast.error(err),
                });
            },
        });
    }

    downloadExamAttachment() {
        this.Attachment.downloadExamAttachment(this.exam(), this.isCollaborative());
    }

    selectGuidePage() {
        this.pageSelected.emit({ page: { type: 'guide' } });
    }

    selectSection(section: ExaminationSection) {
        this.pageSelected.emit({ page: { id: section.id, type: 'section' } });
    }

    displayRoomInstructions() {
        const currentRoom = this.room();
        if (currentRoom) {
            switch (this.translate.currentLang) {
                case 'fi':
                    return currentRoom.roomInstruction;
                case 'sv':
                    return currentRoom.roomInstructionSV;
                case 'en':
                /* falls through */
                default:
                    return currentRoom.roomInstructionEN;
            }
        }
        return '';
    }

    showMaturityInstructions() {
        const currentExam = this.exam();
        this.Enrolment.showMaturityInstructions({ exam: currentExam }, currentExam.external);
    }

    sectionSelectedText() {
        return this.translate.instant('i18n_this_section_is_selected');
    }

    getSkipLinkPath(skipTarget: string) {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    }

    exitPreview() {
        const tab = this.tab || 1;
        const currentExam = this.exam();
        const qp = this.isCollaborative() ? { collaborative: this.isCollaborative() } : {};
        this.router.navigate(['/staff/exams', currentExam.id, tab], {
            queryParams: qp,
        });
    }
}
