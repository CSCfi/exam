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
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { EnrolmentService } from '../../enrolment/enrolment.service';
import type { ExamRoom } from '../../reservation/reservation.model';
import { SessionService } from '../../session/session.service';
import { AttachmentService } from '../../utility/attachment/attachment.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { WindowRef } from '../../utility/window/window.service';
import type { Examination, ExaminationSection } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'examination-toolbar',
    templateUrl: './examinationToolbar.component.html',
})
export class ExaminationToolbarComponent implements OnInit {
    @Input() exam!: Examination;
    @Input() activeSection?: ExaminationSection;
    @Input() isPreview = false;
    @Input() isCollaborative = false;
    @Output() pageSelected = new EventEmitter<{ page: { id?: number; type: string } }>();

    room?: ExamRoom;

    constructor(
        private http: HttpClient,
        private state: StateService,
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private toast: ToastrService,
        private Window: WindowRef,
        private Confirmation: ConfirmationDialogService,
        private Session: SessionService,
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
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

    turnExam = () => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_turn_exam'),
        );
        dialog.result.then(() =>
            // Save all textual answers regardless of empty or not
            this.Examination.saveAllTextualAnswersOfExam$(this.exam)
                .pipe(
                    catchError((err) => {
                        if (err) console.log(err);
                        return of(err);
                    }),
                    finalize(() =>
                        this.Examination.logout(
                            'sitnet_exam_returned',
                            this.exam.hash,
                            this.exam.implementation === 'CLIENT_AUTH',
                            false,
                        ),
                    ),
                )
                .subscribe(),
        );
    };

    abortExam = () => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_abort_exam'),
        );
        dialog.result.then(() =>
            this.Examination.abort$(this.exam.hash).subscribe(
                () => {
                    this.toast.info(this.translate.instant('sitnet_exam_aborted'), undefined, { timeOut: 5000 });
                    this.Window.nativeWindow.onbeforeunload = null;
                    this.state.go('examinationLogout', {
                        reason: 'aborted',
                        quitLinkEnabled: this.exam.implementation === 'CLIENT_AUTH',
                    });
                },
                (err) => this.toast.error(err.data),
            ),
        );
    };

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

    showMaturityInstructions = () => this.Enrolment.showMaturityInstructions({ exam: this.exam });

    exitPreview = () => {
        const tab = parseInt(this.routing.params.tab || 1);
        const collab = this.isCollaborative ? 'collaborative' : 'false';
        if (tab == 1) {
            this.state.go('staff.examEditor.basic', { id: this.exam.id, collaborative: collab });
        } else if (tab == 2) {
            this.state.go('staff.examEditor.sections', { id: this.exam.id, collaborative: collab });
        } else if (tab == 3) {
            this.state.go('staff.examEditor.publication', { id: this.exam.id, collaborative: collab });
        } else if (tab == 4) {
            this.state.go('staff.examEditor.assessments', { id: this.exam.id, collaborative: collab });
        }
    };
}
