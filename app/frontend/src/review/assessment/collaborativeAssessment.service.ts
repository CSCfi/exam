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
/// <reference types="angular-dialog-service" />
import * as ng from 'angular';
import * as toast from 'toastr';

import { Exam, Grade, Participation } from '../../exam/exam.model';

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

export class CollaborativeAssesmentService {
    constructor(
        private $http: ng.IHttpService,
        private $q: ng.IQService,
        private $translate: ng.translate.ITranslateService,
        private $location: ng.ILocationService,
        private $timeout: ng.ITimeoutService,
        private dialogs: angular.dialogservice.IDialogService,
        private Assessment: any,
    ) {
        'ngInject';
    }

    saveAssessmentInfo = (examId: number, examRef: string, participation: Participation) => {
        if (participation.exam.state === 'GRADED_LOGGED') {
            const url = `/integration/iop/reviews/${examId}/${examRef}/info`;
            this.$http
                .put(url, { assessmentInfo: participation.exam.assessmentInfo })
                .then((resp: ng.IHttpResponse<{ rev: string }>) => {
                    participation._rev = resp.data.rev;
                    toast.info(this.$translate.instant('sitnet_saved'));
                });
        }
    };

    sendEmailMessage = (examId: number, examRef: string, message: string): ng.IPromise<void> => {
        const deferred: ng.IDeferred<void> = this.$q.defer();
        const url = `/integration/iop/reviews/${examId}/${examRef}/mail`;
        this.$http
            .post(url, { msg: message })
            .then(() => {
                toast.info(this.$translate.instant('sitnet_email_sent'));
                deferred.resolve();
            })
            .catch(err => {
                toast.error(err.data);
                deferred.reject();
            });
        return deferred.promise;
    };

    saveFeedback(examId: number, examRef: string, participation: Participation): ng.IPromise<void> {
        const deferred: ng.IDeferred<void> = this.$q.defer();
        const payload = {
            rev: participation._rev,
            comment: participation.exam.examFeedback.comment,
        };
        const url = `/integration/iop/reviews/${examId}/${examRef}/comment`;
        this.$http
            .put(url, payload)
            .then((resp: ng.IHttpResponse<{ rev: string }>) => {
                participation._rev = resp.data.rev;
                toast.info(this.$translate.instant('sitnet_comment_updated'));
                deferred.resolve();
            })
            .catch(error => {
                toast.error(error.data);
                deferred.reject();
            });
        return deferred.promise;
    }

    setCommentRead(examId: number, examRef: string, revision: string) {
        const url = `/integration/iop/reviews/${examId}/${examRef}/comment`;
        return this.$http.post(url, { rev: revision });
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
            rev: rev,
        };
    }

    private sendAssessment = (
        newState: string,
        payload: Payload,
        messages: string[],
        participation: Participation,
        examId: number,
        examRef: string,
    ) => {
        const url = `/integration/iop/reviews/${examId}/${examRef}`;
        this.$http
            .put(url, payload)
            .then((resp: ng.IHttpResponse<{ rev: string }>) => {
                participation._rev = resp.data.rev;
                this.saveFeedback(examId, examRef, participation)
                    .then(() => {
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach(msg => toast.warning(this.$translate.instant(msg)));
                            this.$timeout(() => toast.info(this.$translate.instant('sitnet_review_saved')), 1000);
                        } else {
                            toast.info(this.$translate.instant('sitnet_review_graded'));
                            this.$location.path(this.Assessment.getExitUrl({ id: examId }, true));
                        }
                    })
                    .catch(err => toast.error(err.data));
            })
            .catch(err => toast.error(err.data));
    };

    saveAssessment = (participation: Participation, modifiable: boolean, id: number, ref: string) => {
        if (!modifiable) {
            if (participation.exam.state !== 'GRADED') {
                // Just save feedback and leave
                this.saveFeedback(id, ref, participation).then(() => {
                    toast.info(this.$translate.instant('sitnet_saved'));
                    this.$location.path(this.Assessment.getExitUrl(participation.exam, true));
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
                const dialog = this.dialogs.confirm(
                    this.$translate.instant('sitnet_confirm'),
                    this.$translate.instant('sitnet_confirm_grade_review'),
                );
                dialog.result.then(() => this.sendAssessment(newState, payload, messages, participation, id, ref));
            }
        }
    };

    private sendToRegistry = (payload: Payload, examId: number, ref: string, participation: Participation) => {
        payload.state = 'GRADED_LOGGED';
        const url = `/integration/iop/reviews/${examId}/${ref}/record`;
        this.$http
            .put(url, payload)
            .then((resp: ng.IHttpResponse<{ rev: string }>) => {
                participation._rev = resp.data.rev;
                toast.info(this.$translate.instant('sitnet_review_recorded'));
                this.$location.path(this.Assessment.getExitUrl(participation.exam, true));
            })
            .catch(err => toast.error(err.data));
    };

    private register = (participation: Participation, examId: number, ref: string, payload: Payload) => {
        this.saveFeedback(examId, ref, participation)
            .then(() => {
                payload.rev = participation._rev;
                const url = `/integration/iop/reviews/${examId}/${ref}`;
                this.$http
                    .put(url, payload)
                    .then((resp: ng.IHttpResponse<{ rev: string }>) => {
                        payload.rev = participation._rev = resp.data.rev;
                        if (participation.exam.state !== 'GRADED') {
                            toast.info(this.$translate.instant('sitnet_review_graded'));
                        }
                        this.sendToRegistry(payload, examId, ref, participation);
                    })
                    .catch(err => toast.error(err.data));
            })
            .catch(err => err.data);
    };

    createExamRecord = (participation: Participation, examId: number, ref: string) => {
        if (!this.Assessment.checkCredit(participation.exam)) {
            return;
        }
        const messages = this.Assessment.getErrors(participation.exam);
        if (messages.length > 0) {
            messages.forEach(msg => toast.error(this.$translate.instant(msg)));
        } else {
            const dialogNote = participation.exam.gradeless
                ? this.$translate.instant('sitnet_confirm_archiving_without_grade')
                : this.Assessment.getRecordReviewConfirmationDialogContent(participation.exam.examFeedback.comment);
            const payload = this.getPayload(participation.exam, 'GRADED', participation._rev);
            this.dialogs
                .confirm(this.$translate.instant('sitnet_confirm'), dialogNote)
                .result.then(() => this.register(participation, examId, ref, payload));
        }
    };
}

angular.module('app.review').service('CollaborativeAssessment', CollaborativeAssesmentService);
