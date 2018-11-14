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

angular.module('app.enrolment')
    .component('examParticipation', {
        template: require('./examParticipation.template.html'),
        bindings: {
            participation: '<',
            collaborative: '<'
        },
        controller: ['$scope', '$translate', 'StudentExamRes', 'Exam',
            function ($scope, $translate, StudentExamRes, Exam) {

                const vm = this;

                vm.$onInit = function () {
                    const state = vm.participation.exam.state;
                    if (state === 'GRADED_LOGGED' || state === 'REJECTED' || state === 'ARCHIVED'
                        || (state === 'GRADED' && vm.participation.exam.autoEvaluationNotified)) {
                        if (vm.collaborative) {
                            // No need to load anything, because we have already everything.
                            prepareReview(vm.participation.exam);
                            return;
                        }
                        loadReview();
                    }
                };

                const loadReview = function () {
                    StudentExamRes.feedback.get({eid: vm.participation.exam.id},
                        prepareReview
                    );
                };

                $scope.$on('$localeChangeSuccess', function () {
                    if (vm.participation.reviewedExam) {
                        vm.participation.reviewedExam.grade.displayName =
                            Exam.getExamGradeDisplayName(vm.participation.reviewedExam.grade.name);
                    }
                });

                const prepareReview = function (exam) {
                    if (!exam.grade) {
                        exam.grade = {name: 'NONE'};
                    }
                    if (exam.languageInspection) {
                        exam.grade.displayName = $translate.instant(
                            exam.languageInspection.approved ? 'sitnet_approved' : 'sitnet_rejected');
                        exam.contentGrade = Exam.getExamGradeDisplayName(exam.grade.name);
                        exam.gradedTime = exam.languageInspection.finishedAt;
                    } else {
                        exam.grade.displayName = Exam.getExamGradeDisplayName(exam.grade.name);
                    }
                    Exam.setCredit(exam);
                    if (exam.creditType) {
                        exam.creditType.displayName = Exam.getExamTypeDisplayName(exam.creditType.type);
                    }
                    vm.participation.reviewedExam = exam;
                    if (vm.collaborative) {
                        // No need to load separate scores.
                        prepareScores(exam);
                        return;
                    }
                    StudentExamRes.scores.get({eid: vm.participation.exam.id},
                        prepareScores);
                }

                const prepareScores = function (data) {
                    vm.participation.scores = {
                        maxScore: data.maxScore,
                        totalScore: data.totalScore,
                        approvedAnswerCount: data.approvedAnswerCount,
                        rejectedAnswerCount: data.rejectedAnswerCount,
                        hasApprovedRejectedAnswers: data.approvedAnswerCount + data.rejectedAnswerCount > 0
                    };
                }
            }
        ]
    });




