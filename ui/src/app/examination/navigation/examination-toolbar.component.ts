// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, SlicePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
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
    imports: [NgClass, NgbPopover, UpperCasePipe, SlicePipe, TranslateModule, OrderByPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationToolbarComponent {
    exam = input.required<Examination>();
    activeSection = input<ExaminationSection | undefined>(undefined);
    isPreview = input(false);
    isCollaborative = input(false);
    pageSelected = output<{ page: { id?: number; type: string } }>();

    room = signal<ExamRoom | undefined>(undefined);
    tab?: number;

    private http = inject(HttpClient);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Confirmation = inject(ConfirmationDialogService);
    private Session = inject(SessionService);
    private Examination = inject(ExaminationService);
    private Attachment = inject(AttachmentService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        this.tab = this.route.snapshot.queryParams.tab;

        // Load room when exam is available and conditions are met
        effect(() => {
            const currentExam = this.exam();
            const currentIsPreview = this.isPreview();
            if (!currentIsPreview && currentExam.implementation === 'AQUARIUM') {
                this.http
                    .get<ExamRoom>('/app/enrolments/room/' + currentExam.hash)
                    .subscribe((resp) => this.room.set(resp));
            }
        });
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
                this.Examination.saveAllTextualAnswersOfExam$(currentExam)
                    .pipe(
                        catchError((err) => {
                            if (err) console.log(err);
                            return of(err);
                        }),
                        finalize(() =>
                            this.Examination.logout(
                                'i18n_exam_returned',
                                currentExam.hash,
                                currentExam.implementation === 'CLIENT_AUTH',
                                false,
                            ),
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
                this.Examination.abort$(currentExam.hash).subscribe({
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

    getQuestionAmount(section: ExaminationSection, type: string) {
        if (type === 'total') {
            return section.sectionQuestions.length;
        } else if (type === 'answered') {
            return section.sectionQuestions.filter(this.Examination.isAnswered).length;
        } else if (type === 'unanswered') {
            return (
                section.sectionQuestions.length - section.sectionQuestions.filter(this.Examination.isAnswered).length
            );
        }
        return 0;
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
