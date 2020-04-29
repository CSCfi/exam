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
import { StateParams, StateService } from '@uirouter/core';
import * as angular from 'angular';
import * as toast from 'toastr';

import { Room } from '../../calendar/calendar.service';
import { EnrolmentService } from '../../enrolment/enrolment.service';
import { Exam, ExamSection } from '../../exam/exam.model';
import { SessionService } from '../../session/session.service';
import { AttachmentService } from '../../utility/attachment/attachment.service';

export const ExaminationToolbarComponent: angular.IComponentOptions = {
    template: require('./examinationToolbar.template.html'),
    bindings: {
        exam: '<',
        activeSection: '<',
        isPreview: '<',
        isCollaborative: '<',
        onPageSelect: '&',
    },
    controller: class ExaminationToolbarController implements angular.IComponentController, angular.IOnInit {
        exam: Exam;
        activeSection: ExamSection;
        isPreview: boolean;
        isCollaborative: boolean;
        onPageSelect: (_: { page: { id?: number; type: string } }) => unknown;
        room: Room;

        constructor(
            private $http: angular.IHttpService,
            private $state: StateService,
            private $stateParams: StateParams,
            private $window: angular.IWindowService,
            private $translate: angular.translate.ITranslateService,
            private dialogs: angular.dialogservice.IDialogService,
            private Session: SessionService,
            private Examination: any,
            private Attachment: AttachmentService,
            private Enrolment: EnrolmentService,
        ) {
            'ngInject';
        }

        $onInit() {
            if (!this.isPreview && this.exam.implementation === 'AQUARIUM') {
                this.$http
                    .get('/app/enrolments/room/' + this.exam.hash)
                    .then((resp: angular.IHttpResponse<Room>) => (this.room = resp.data));
            }
        }

        displayUser = () => {
            const user = this.Session.getUser();
            if (!user) {
                return;
            }
            const userId = user.userIdentifier ? ' (' + user.userIdentifier + ')' : '';
            return user.firstName + ' ' + user.lastName + userId;
        };

        turnExam = () => {
            const dialog = this.dialogs.confirm(
                this.$translate.instant('sitnet_confirm'),
                this.$translate.instant('sitnet_confirm_turn_exam'),
            );
            dialog.result.then(() =>
                // Save all textual answers regardless of empty or not
                this.Examination.saveAllTextualAnswersOfExam(this.exam).then(() =>
                    this.Examination.logout(
                        'sitnet_exam_returned',
                        this.exam.hash,
                        this.exam.implementation === 'CLIENT_AUTH',
                    ),
                ),
            );
        };

        abortExam = () => {
            const dialog = this.dialogs.confirm(
                this.$translate.instant('sitnet_confirm'),
                this.$translate.instant('sitnet_confirm_abort_exam'),
            );
            dialog.result.then(() =>
                this.Examination.abort(this.exam.hash)
                    .then(() => {
                        toast.info(this.$translate.instant('sitnet_exam_aborted'), undefined, { timeOut: 5000 });
                        this.$window.onbeforeunload = null;
                        this.$state.go('examinationLogout', {
                            reason: 'aborted',
                            quitLinkEnabled: this.exam.implementation === 'CLIENT_AUTH',
                        });
                    })
                    .catch(err => toast.error(err.data)),
            );
        };

        downloadExamAttachment = () => this.Attachment.downloadExamAttachment(this.exam, this.isCollaborative);

        selectGuidePage = () => this.onPageSelect({ page: { type: 'guide' } });

        selectSection = (section: ExamSection) => this.onPageSelect({ page: { id: section.id, type: 'section' } });

        getQuestionAmount = (section, type) => {
            if (type === 'total') {
                return section.sectionQuestions.length;
            } else if (type === 'answered') {
                return section.sectionQuestions.filter(this.Examination.isAnswered).length;
            } else if (type === 'unanswered') {
                return (
                    section.sectionQuestions.length -
                    section.sectionQuestions.filter(this.Examination.isAnswered).length
                );
            }
        };

        displayRoomInstructions = () => {
            if (this.room) {
                switch (this.$translate.use()) {
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
        };

        showMaturityInstructions = () => this.Enrolment.showMaturityInstructions({ exam: this.exam });

        exitPreview = () => {
            const state = this.isCollaborative ? 'collaborativeExamEditor' : 'examEditor';
            this.$state.go(state, { id: this.exam.id, tab: this.$stateParams.tab });
        };
    },
};

angular.module('app.examination').component('examinationToolbar', ExaminationToolbarComponent);
