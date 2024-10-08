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
import { NgClass, SlicePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
    standalone: true,
    imports: [NgClass, NgbPopover, UpperCasePipe, SlicePipe, TranslateModule, OrderByPipe],
})
export class ExaminationToolbarComponent implements OnInit {
    @Input() exam!: Examination;
    @Input() activeSection?: ExaminationSection;
    @Input() isPreview = false;
    @Input() isCollaborative = false;
    @Output() pageSelected = new EventEmitter<{ page: { id?: number; type: string } }>();

    room?: ExamRoom;
    tab?: number;

    constructor(
        private http: HttpClient,
        private router: Router,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Session: SessionService,
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
        this.tab = this.route.snapshot.queryParams.tab;
        if (!this.isPreview && this.exam.implementation === 'AQUARIUM') {
            this.http.get<ExamRoom>('/app/enrolments/room/' + this.exam.hash).subscribe((resp) => (this.room = resp));
        }
    }

    displayUser = () => {
        const user = this.Session.getUser();
        if (!user) {
            return;
        }
        const userId = user.userIdentifier ? ' (' + user.userIdentifier + ')' : '';
        return `${user.firstName} ${user.lastName} ${userId}`;
    };

    turnExam = () =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_turn_exam'),
        ).subscribe({
            next: () =>
                // Save all textual answers regardless of empty or not
                this.Examination.saveAllTextualAnswersOfExam$(this.exam)
                    .pipe(
                        catchError((err) => {
                            if (err) console.log(err);
                            return of(err);
                        }),
                        finalize(() =>
                            this.Examination.logout(
                                'i18n_exam_returned',
                                this.exam.hash,
                                this.exam.implementation === 'CLIENT_AUTH',
                                false,
                            ),
                        ),
                    )
                    .subscribe(),
        });

    abortExam = () =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_abort_exam'),
        ).subscribe({
            next: () =>
                this.Examination.abort$(this.exam.hash).subscribe({
                    next: () => {
                        this.toast.info(this.translate.instant('i18n_exam_aborted'), undefined, { timeOut: 5000 });
                        this.router.navigate(['/examination/logout'], {
                            queryParams: {
                                reason: 'aborted',
                                quitLinkEnabled: this.exam.implementation === 'CLIENT_AUTH',
                            },
                        });
                    },
                    error: (err) => this.toast.error(err),
                }),
        });

    downloadExamAttachment = () => this.Attachment.downloadExamAttachment(this.exam, this.isCollaborative);

    selectGuidePage = () => this.pageSelected.emit({ page: { type: 'guide' } });

    selectSection = (section: ExaminationSection) =>
        this.pageSelected.emit({ page: { id: section.id, type: 'section' } });

    getQuestionAmount = (section: ExaminationSection, type: string) => {
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
    };

    displayRoomInstructions = () => {
        if (this.room) {
            switch (this.translate.currentLang) {
                case 'fi':
                    return this.room.roomInstruction;
                case 'sv':
                    return this.room.roomInstructionSV;
                case 'en':
                /* falls through */
                default:
                    return this.room.roomInstructionEN;
            }
        }
        return '';
    };

    showMaturityInstructions = () => this.Enrolment.showMaturityInstructions({ exam: this.exam }, this.exam.external);

    sectionSelectedText = () => {
        return this.translate.instant('i18n_this_section_is_selected');
    };

    getSkipLinkPath = (skipTarget: string) => {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    };

    exitPreview = () => {
        const tab = this.tab || 1;
        const qp = this.isCollaborative ? { collaborative: this.isCollaborative } : {};
        this.router.navigate(['/staff/exams', this.exam.id, tab], {
            queryParams: qp,
        });
    };
}
