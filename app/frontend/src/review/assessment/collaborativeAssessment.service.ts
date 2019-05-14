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
import * as toast from 'toastr';
import { Exam, Grade, Participation } from '../../exam/exam.model';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AssessmentService } from './assessment.service';


interface Payload {
    id: number;
    state: string;
    grade: Grade | null;
    gradeless: boolean;
    customCredit: number;
    creditType: { type: string };
    answerLanguage?: string;
    additionalInfo: string;
    rev: string;
}

@Injectable()
export class CollaborativeAssesmentService {

    constructor(private http: HttpClient,
        private translate: TranslateService,
        private Location: Location,
        private dialogs: ConfirmationDialogService,
        private Assessment: AssessmentService) { }

    saveAssessmentInfo = (examId: number, examRef: string, participation: Participation): Observable<Participation> => {
        if (participation.exam.state === 'GRADED_LOGGED') {
            const url = `/integration/iop/reviews/${examId}/${examRef}/info`;
            return this.http.put<{ rev: string }>(url, { assessmentInfo: participation.exam.assessmentInfo }).pipe(
                tap(() => toast.info(this.translate.instant('sitnet_saved'))),
                map(data => {
                    participation._rev = data.rev;
                    return participation;
                })
            );
        }
        return of(participation);
    }

    sendEmailMessage = (examId: number, examRef: string, message: string): Observable<void> => {
        const url = `/integration/iop/reviews/${examId}/${examRef}/mail`;
        return this.http.post<void>(url, { msg: message });
    }

    saveFeedback(examId: number, examRef: string, participation: Participation): Observable<Participation> {
        const payload = {
            'rev': participation._rev,
            'comment': participation.exam.examFeedback.comment
        };
        const url = `/integration/iop/reviews/${examId}/${examRef}/comment`;
        return this.http.put<{ rev: string }>(url, payload).pipe(
            tap(() => toast.info(this.translate.instant('sitnet_comment_added'))),
            map(data => {
                participation._rev = data.rev;
                return participation;
            })
        );
    }

    private getPayload(exam: Exam, state: string, rev: string): Payload {
        return {
            id: exam.id,
            state: state || exam.state,
            grade: exam.gradeless ? null : exam.grade,
            gradeless: exam.gradeless,
            customCredit: exam.customCredit,
            creditType: exam.creditType,
            answerLanguage: exam.answerLanguage ? exam.answerLanguage.code : undefined,
            additionalInfo: exam.additionalInfo,
            rev: rev
        };
    }

    private sendAssessment = (newState: string, payload: Payload, messages: string[],
        participation: Participation, examId: number, examRef: string) => {

        const url = `/integration/iop/reviews/${examId}/${examRef}`;
        this.http.put<{ rev: string }>(url, payload).subscribe(
            data => {
                participation._rev = data.rev;
                this.saveFeedback(examId, examRef, participation).subscribe(
                    () => {
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach(msg => toast.warning(this.translate.instant(msg)));
                            setTimeout(() => toast.info(this.translate.instant('sitnet_review_saved')), 1000);
                        } else {
                            toast.info(this.translate.instant('sitnet_review_graded'));
                            this.Location.go(this.Assessment.getExitUrlById(examId, true));
                        }
                    }, resp => toast.error(resp.error));
            }, resp => toast.error(resp.error)
        );
    }

    saveAssessment = (participation: Participation, modifiable: boolean, id: number, ref: string) => {
        if (!modifiable) {
            if (participation.exam.state !== 'GRADED') {
                // Just save feedback and leave
                this.saveFeedback(id, ref, participation).subscribe(() => {
                    toast.info(this.translate.instant('sitnet_saved'));
                    this.Location.go(this.Assessment.getExitUrlById(participation.exam.id, true));
                });
            }
        } else {
            if (!this.Assessment.checkCredit(participation.exam)) {
                return;
            }
            const messages = this.Assessment.getErrors(participation.exam);
            const oldState = participation.exam.state;
            const newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';
            const payload = this.getPayload(participation.exam, newState, participation._rev);
            if (newState !== 'GRADED' || oldState === 'GRADED') {
                this.sendAssessment(newState, payload, messages, participation, id, ref);
            } else {
                const dialog = this.dialogs.open(
                    this.translate.instant('sitnet_confirm'), this.translate.instant('sitnet_confirm_grade_review'));
                dialog.result.then(() => this.sendAssessment(newState, payload, messages, participation, id, ref));
            }
        }
    }

    private sendToRegistry = (payload: Payload, examId: number, ref: string, participation: Participation) => {
        payload.state = 'GRADED_LOGGED';
        const url = `/integration/iop/reviews/${examId}/${ref}/record`;
        this.http.put<{ rev: string }>(url, payload).subscribe(
            data => {
                participation._rev = data.rev;
                toast.info(this.translate.instant('sitnet_review_recorded'));
                this.Location.go(this.Assessment.getExitUrlById(participation.exam.id, true));
            }, resp => toast.error(resp.error)
        );
    }

    private register = (participation: Participation, examId: number, ref: string, payload: Payload) => {
        this.saveFeedback(examId, ref, participation).subscribe(
            () => {
                payload.rev = participation._rev;
                const url = `/integration/iop/reviews/${examId}/${ref}`;
                this.http.put<{ rev: string }>(url, payload).subscribe(
                    data => {
                        payload.rev = participation._rev = data.rev;
                        if (participation.exam.state !== 'GRADED') {
                            toast.info(this.translate.instant('sitnet_review_graded'));
                        }
                        this.sendToRegistry(payload, examId, ref, participation);
                    },
                    resp => toast.error(resp.error)
                );
            },
            resp => toast.error(resp.error)
        );
    }


    createExamRecord = (participation: Participation, examId: number, ref: string) => {
        if (!this.Assessment.checkCredit(participation.exam)) {
            return;
        }
        const messages = this.Assessment.getErrors(participation.exam);
        if (messages.length > 0) {
            messages.forEach(msg => toast.error(this.translate.instant(msg)));
        } else {
            const dialogNote = participation.exam.gradeless ?
                this.translate.instant('sitnet_confirm_archiving_without_grade') :
                this.Assessment.getRecordReviewConfirmationDialogContent(
                    participation.exam.examFeedback.comment);
            const payload = this.getPayload(participation.exam, 'GRADED', participation._rev);
            this.dialogs.open(this.translate.instant('sitnet_confirm'), dialogNote).result
                .then(() => this.register(participation, examId, ref, payload));
        }
    }
}


