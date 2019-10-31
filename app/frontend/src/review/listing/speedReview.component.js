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
import FileSaver from 'file-saver';
import _ from 'lodash';
import moment from 'moment';
import toast from 'toastr';

angular.module('app.review').component('speedReview', {
    template: require('./speedReview.template.html'),
    controller: [
        'dialogs',
        '$q',
        '$state',
        '$stateParams',
        '$translate',
        'ExamRes',
        'Exam',
        'ReviewList',
        'Files',
        '$uibModal',
        function(dialogs, $q, $state, $stateParams, $translate, ExamRes, Exam, ReviewList, Files, $modal) {
            const handleOngoingReviews = review => ReviewList.gradeExam(review.exam);

            this.$onInit = () => {
                this.pageSize = 10;
                this.eid = $stateParams.id;

                ExamRes.exams.get({ id: $stateParams.id }, exam => {
                    this.examInfo = {
                        examOwners: exam.examOwners,
                        title: exam.course.code + ' ' + exam.name,
                        anonymous: exam.anonymous,
                    };
                    ExamRes.examReviews.query(
                        { eid: $stateParams.id },
                        reviews => {
                            reviews.forEach(r => {
                                r.displayName = r.user ? `${r.user.lastName} ${r.user.firstName}` : r.exam.id;
                                r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                                if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                    r.isUnderLanguageInspection = true;
                                }
                            });
                            this.examReviews = reviews.filter(
                                r => r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED',
                            );
                            this.examReviews.forEach(handleOngoingReviews);
                            this.toggleReviews = this.examReviews.length > 0;
                        },
                        error => toast.error(error.data),
                    );
                });
            };

            this.showFeedbackEditor = exam => {
                $modal.open({
                    backdrop: 'static',
                    keyboard: true,
                    component: 'reviewFeedback',
                    resolve: {
                        exam: () => exam,
                    },
                });
            };

            this.isAllowedToGrade = exam => Exam.isOwnerOrAdmin(exam);

            const getErrors = exam => {
                const messages = [];
                if (!this.isAllowedToGrade(exam)) {
                    messages.push('sitnet_error_unauthorized');
                }
                if (!exam.creditType && !exam.examType) {
                    messages.push('sitnet_exam_choose_credit_type');
                }
                if (!exam.answerLanguage && exam.examLanguages.length !== 1) {
                    messages.push('sitnet_exam_choose_response_language');
                }
                return messages;
            };

            const getAnswerLanguage = exam =>
                _.get(exam, 'answerLanguage.code') || exam.answerLanguage || exam.examLanguages[0].code;

            const gradeExam = review => {
                const deferred = $q.defer();
                const exam = review.exam;
                const messages = getErrors(exam);
                if (!exam.selectedGrade && !exam.grade.id) {
                    messages.push('sitnet_participation_unreviewed');
                }
                messages.forEach(msg => toast.warning($translate.instant(msg)));
                if (messages.length === 0) {
                    let grade;
                    if (exam.selectedGrade.type === 'NONE') {
                        grade = undefined;
                        exam.gradeless = true;
                    } else {
                        grade = exam.selectedGrade.id ? exam.selectedGrade : exam.grade;
                        exam.gradeless = false;
                    }
                    const data = {
                        id: exam.id,
                        state: 'GRADED',
                        gradeless: exam.gradeless,
                        grade: grade ? grade.id : undefined,
                        customCredit: exam.customCredit,
                        creditType: exam.creditType ? exam.creditType.type : exam.examType.type,
                        answerLanguage: getAnswerLanguage(exam),
                    };
                    ExamRes.review.update(
                        { id: exam.id },
                        data,
                        () => {
                            this.examReviews.splice(this.examReviews.indexOf(review), 1);
                            exam.gradedTime = new Date().getTime();
                            exam.grade = grade;
                            deferred.resolve();
                        },
                        error => {
                            toast.error(error.data);
                            deferred.reject();
                        },
                    );
                } else {
                    deferred.reject();
                }
                return deferred.promise;
            };

            this.isGradeable = exam => exam && getErrors(exam).length === 0;

            this.hasModifications = () => {
                if (this.examReviews) {
                    return (
                        this.examReviews.filter(
                            r =>
                                r.exam.selectedGrade &&
                                (r.exam.selectedGrade.id || r.exam.selectedGrade.type === 'NONE') &&
                                this.isGradeable(r.exam),
                        ).length > 0
                    );
                }
            };

            this.pageSelected = page => (this.currentPage = page);

            this.gradeExams = () => {
                const reviews = this.examReviews.filter(
                    r => r.exam.selectedGrade && r.exam.selectedGrade.type && this.isGradeable(r.exam),
                );
                const dialog = dialogs.confirm(
                    $translate.instant('sitnet_confirm'),
                    $translate.instant('sitnet_confirm_grade_review'),
                );
                dialog.result.then(() => {
                    const promises = [];
                    reviews.forEach(r => promises.push(gradeExam(r)));
                    $q.all(promises).then(() => {
                        toast.info($translate.instant('sitnet_saved'));
                        if (this.examReviews.length === 0) {
                            $state.go('examEditor', { id: $stateParams.id, tab: 4 });
                        }
                    });
                });
            };

            this.isOwner = (user, owners) => {
                if (owners) {
                    return owners.some(o => o.firstName + o.lastName === user.firstName + user.lastName);
                }
                return false;
            };

            this.importGrades = () => {
                $modal
                    .open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            title: () => {
                                return 'sitnet_import_grades_from_csv';
                            },
                        },
                    })
                    .result.then(data =>
                        Files.upload('/app/gradeimport', data.attachmentFile, {}, null, $state.reload),
                    );
            };

            this.createGradingTemplate = () => {
                const rows = this.examReviews
                    .map(
                        r =>
                            [
                                r.exam.id,
                                '',
                                '',
                                r.exam.totalScore + ' / ' + r.exam.maxScore,
                                r.displayName,
                                r.user ? r.user.userIdentifier : '',
                            ].join() + '\n',
                    )
                    .reduce((a, b) => a + b, '');

                const content = 'exam id,grade,feedback,total score,student,student id\n' + rows;
                const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
                FileSaver.saveAs(blob, 'grading.csv');
            };
        },
    ],
});
