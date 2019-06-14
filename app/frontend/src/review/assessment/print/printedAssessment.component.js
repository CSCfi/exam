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
import moment from 'moment';


angular.module('app.review')
    .component('printedAssessment', {
        template: require('./printedAssessment.template.html'),
        bindings: {
            exam: '<',
            collaborative: '<'
        },
        controller: ['$routeParams', '$document', '$http', 'Question', 'Exam', 'Assessment',
            'Session', 'Language',
            function ($routeParams, $document, $http, Question, Exam, Assessment, Session, Language) {

                const vm = this;

                vm.$onInit = function () {

                    const path = vm.collaborative ? `${$routeParams.id}/${$routeParams.ref}` : $routeParams.id;
                    const url = getResource(path);

                    $http.get(url).then(function (resp) { //TODO: Some duplicates here, refactor some more
                        // TODO: this is ugly. Should make ReviewController return a participation too
                        const participation = vm.collaborative ? resp.data : resp.data.examParticipation;
                        const exam = vm.collaborative ? participation.exam : resp.data;
                        exam.examSections.forEach(function (es) {
                            es.sectionQuestions.filter(function (esq) {
                                return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                            }).forEach(function (esq) {
                                esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                            });
                        });

                        vm.questionSummary = Question.getQuestionAmounts(exam);
                        vm.exam = exam;
                        vm.user = Session.getUser();

                        vm.participation = participation;
                        const duration = moment.utc(new Date(vm.participation.duration));
                        if (duration.second() > 29) {
                            duration.add(1, 'minutes');
                        }
                        vm.participation.duration = duration.format('HH:mm');

                        vm.student = vm.participation.user;
                        vm.enrolment = vm.exam.examEnrolments[0];
                        vm.reservation = vm.enrolment.reservation;

                        let participationsApi = Assessment.participationsApi;
                        const params = {
                            eid: vm.exam.id
                        };
                        if (vm.collaborative) {
                            participationsApi = Assessment.collaborativeParticipationsApi;
                            params.eid = $routeParams.id;
                            params.aid = $routeParams.ref;
                        }
                        participationsApi.query(params, handleParticipations);

                        /*Assessment.participationsApi.query({
                            eid: vm.exam.parent.id,
                            uid: vm.student.id
                        }, function (data) {
                            // Filter out the participation we are looking into
                            const previousParticipations = data.filter(function (p) {
                                return p.id !== vm.participation.id;
                            });
                            Assessment.noShowApi.query({
                                eid: vm.exam.parent.id,
                                uid: vm.student.id
                            }, function (data) {
                                const noShows = data.map(function (d) {
                                    return { noShow: true, started: d.reservation.startAt, exam: { state: 'no_show' } };
                                });
                                vm.previousParticipations = previousParticipations.concat(noShows);
                            });
                        });*/

                    });
                };

                const handleParticipations = (data) => {
                    if (vm.collaborative) {
                        //TODO: Add collaborative support for noshows.
                        vm.previousParticipations = data;
                        printPage();
                        return;
                    }
                    // Filter out the participation we are looking into
                    const previousParticipations = data.filter(function (p) {
                        return p.id !== vm.participation.id;
                    });
                    Assessment.noShowApi.query({ eid: vm.exam.id }, function (data) {
                        const noShows = data.map(function (d) {
                            return { noShow: true, started: d.reservation.startAt, exam: { state: 'no_show' } };
                        });
                        vm.previousParticipations = previousParticipations.concat(noShows);
                        printPage();
                    });
                }

                const printPage = () => {
                    $document.ready(function () {
                        $('#vmenu').hide();
                        const mainView = $('#mainView');
                        mainView.css('margin', '0 15px');
                        mainView.css('max-width', '1000px');

                        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
                        setTimeout(function () {
                            window.print();
                        }, 2000);
                    });
                }

                const getResource = function (path) {
                    return vm.collaborative ? `/integration/iop/reviews/${path}` : `/app/review/${path}`;
                }

                vm.translateGrade = function (participation) {
                    return !participation.exam.grade ? 'N/A' : Exam.getExamGradeDisplayName(participation.exam.grade.name);
                };

                vm.getGrade = function () {
                    return !vm.exam.grade ? 'N/A' : Exam.getExamGradeDisplayName(vm.exam.grade.name);
                };

                vm.getCreditType = function () {
                    return !vm.exam ? 'N/A' : Exam.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.getLanguage = function () {
                    if (!vm.exam) return 'N/A';
                    const lang = Assessment.pickExamLanguage(vm.exam);
                    return !lang ? 'N/A' : Language.getLanguageNativeName(lang.code);
                };

                vm.getExamMaxPossibleScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return Exam.getTotalScore(vm.exam);
                };

                vm.getTeacherCount = function () {
                    // Do not add up if user exists in both groups
                    const exam = vm.collaborative ? vm.exam : vm.exam.parent;
                    const owners = exam.examOwners.filter(function (owner) {
                        return vm.exam.examInspections.map(function (inspection) {
                            return inspection.user.id;
                        }).indexOf(owner.id) === -1;
                    });
                    return vm.exam.examInspections.length + owners.length;
                };


            }
        ]
    });
