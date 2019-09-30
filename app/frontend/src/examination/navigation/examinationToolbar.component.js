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
import angular from 'angular';
import toast from 'toastr';

angular.module('app.examination')
    .component('examinationToolbar', {
        template: require('./examinationToolbar.template.html'),
        bindings: {
            exam: '<',
            activeSection: '<',
            isPreview: '<',
            isCollaborative: '<',
            onPageSelect: '&'
        },
        controller: ['$http', '$location', '$window', '$translate', 'dialogs', 'Session', 'Examination',
            'Attachment', 'Enrolment',
            function ($http, $location, $window, $translate, dialogs, Session, Examination, Attachment,
                Enrolment) {

                this.$onInit = () => {
                    if (!this.isPreview) {
                        $http.get('/app/enrolments/room/' + this.exam.hash).then(resp => this.room = resp.data);
                    }
                };

                this.displayUser = () => {
                    const user = Session.getUser();
                    if (!user) {
                        return;
                    }
                    const userId = user.userIdentifier ? ' (' + user.userIdentifier + ')' : '';
                    return user.firstName + ' ' + user.lastName + userId;
                };

                this.turnExam = () => {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_turn_exam'));
                    dialog.result.then(() =>
                        // Save all textual answers regardless of empty or not
                        Examination.saveAllTextualAnswersOfExam(this.exam).then(
                            () => Examination.logout('sitnet_exam_returned', this.exam.hash,
                                this.exam.requiresUserAgentAuth))
                    );
                };

                this.abortExam = () => {
                    const dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_abort_exam'));
                    dialog.result.then(() =>
                        Examination.abort(this.exam.hash).then(() => {
                            toast.info($translate.instant('sitnet_exam_aborted'), { timeOut: 5000 });
                            $window.onbeforeunload = null;
                            $location.path('/student/logout/aborted/' + this.exam.requiresUserAgentAuth);
                        }).catch(err => toast.error(err.data))
                    );
                };

                this.downloadExamAttachment = () =>
                    Attachment.downloadExamAttachment(this.exam, this.isCollaborative);


                this.selectGuidePage = () => this.onPageSelect({ page: { type: 'guide' } });

                this.selectSection = (section) =>
                    this.onPageSelect({ page: { id: section.id, type: 'section' } });

                this.getQuestionAmount = (section, type) => {
                    if (type === 'total') {
                        return section.sectionQuestions.length;
                    } else if (type === 'answered') {
                        return section.sectionQuestions.filter(Examination.isAnswered).length;
                    } else if (type === 'unanswered') {
                        return section.sectionQuestions.length -
                            section.sectionQuestions.filter(Examination.isAnswered).length;
                    }
                };

                this.displayRoomInstructions = () => {
                    if (this.room) {
                        switch ($translate.use()) {
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

                this.showMaturityInstructions = () => Enrolment.showMaturityInstructions({ exam: this.exam });

                this.exitPreview = () => $location.path($location.path().replace("/view/preview", ""));

            }
        ]
    });
