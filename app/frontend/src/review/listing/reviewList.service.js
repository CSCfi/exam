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
import _ from 'lodash';
import toast from 'toastr';

class ReviewListService {
    constructor($q, $http, $translate, Exam, ExamRes) {
        this.getDisplayName = (review, collaborative = false) => {
            return review.user
                ? `${review.user.lastName} ${review.user.firstName}`
                : collaborative
                ? review._id
                : review.exam.id;
        };
        this.gradeExam = exam => {
            if (!exam.grade || !exam.grade.id) {
                exam.grade = {};
            }
            if (!exam.selectedGrade) {
                exam.selectedGrade = {};
            }
            const scale = exam.gradeScale || exam.parent.gradeScale || exam.course.gradeScale;
            scale.grades = scale.grades || [];
            exam.selectableGrades = scale.grades.map(grade => {
                grade.type = grade.name;
                grade.name = Exam.getExamGradeDisplayName(grade.name);
                if (exam.grade && exam.grade.id === grade.id) {
                    exam.grade.type = grade.type;
                    exam.selectedGrade = grade;
                }
                return grade;
            });
            const noGrade = { type: 'NONE', name: Exam.getExamGradeDisplayName('NONE') };
            if (exam.gradeless && !exam.selectedGrade) {
                exam.selectedGrade = noGrade;
            }
            exam.selectableGrades.push(noGrade);
        };
        this.filterReview = (filter, review) => {
            if (!filter) {
                return true;
            }
            const s = filter.toLowerCase();
            const name = _.get(review, 'user.firstName', '') + ' ' + _.get(review, 'user.lastName', '');
            return (
                name.toLowerCase().indexOf(s) > -1 ||
                _.get(review, 'user.email', '')
                    .toLowerCase()
                    .indexOf(s) > -1
            );
        };
        this.filterByState = (reviews, states) => {
            return reviews.filter(r => {
                return states.indexOf(r.exam.state) > -1;
            });
        };
        this.prepareView = (items, setup) => {
            items.forEach(setup);
            return {
                items: items,
                filtered: items,
                toggle: items.length > 0,
                pageSize: 30,
            };
        };
        this.applyFilter = (filter, items) => {
            if (!filter) {
                return items;
            }
            return items.filter(i => {
                return this.filterReview(filter, i);
            });
        };
        const resetSelections = (scope, view) => {
            let prev, next;
            for (const k in scope) {
                if (Object.prototype.hasOwnProperty.call(scope, k)) {
                    if (k === view) {
                        scope[k] = !scope[k];
                        next = scope[k];
                    } else {
                        if (scope[k]) {
                            prev = true;
                        }
                        scope[k] = false;
                    }
                }
            }
            return prev && next;
        };
        this.selectAll = (scope, items) => {
            const override = resetSelections(scope, 'all');
            items.forEach(i => (i.selected = !i.selected || override));
        };
        this.selectPage = (scope, items, selector) => {
            const override = resetSelections(scope, 'page');
            const boxes = angular.element('.' + selector);
            const ids = [];
            boxes.forEach(input => ids.push(parseInt(angular.element(input).val())));
            // init all as not selected
            if (override) {
                items.forEach(i => (i.selected = false));
            }
            items.filter(i => ids.indexOf(i.exam.id) > -1).forEach(pi => (pi.selected = !pi.selected || override));
        };
        this.getSelectedReviews = items => {
            const objects = items.filter(i => i.selected);
            if (objects.length === 0) {
                toast.warning($translate.instant('sitnet_choose_atleast_one'));
                return;
            }
            return objects;
        };
        const send = (review, examId, state) => {
            const deferred = $q.defer();
            const exam = review.exam;
            if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
                const examToRecord = {
                    id: exam.id,
                    state: state,
                    grade: exam.grade,
                    customCredit: exam.customCredit,
                    totalScore: exam.totalScore,
                    creditType: exam.creditType,
                    answerLanguage: exam.answerLanguage,
                };
                if (examId) {
                    const url = `/integration/iop/reviews/${examId}/${review._id}/record`;
                    examToRecord.rev = review._rev;
                    $http.put(url, examToRecord).then(function(resp) {
                        review._rev = resp.data.rev;
                        deferred.resolve();
                    });
                } else {
                    const resource = exam.gradeless ? ExamRes.register : ExamRes.saveRecord;
                    resource.add(examToRecord, () => deferred.resolve());
                }
            } else {
                toast.error($translate.instant('sitnet_failed_to_record_review'));
                deferred.reject();
            }
            return deferred.promise;
        };
        this.sendToArchive = (review, examId) => send(review, examId, 'ARCHIVED');
        this.sendToRegistry = (review, examId) => send(review, examId, 'GRADED_LOGGED');
    }
}

angular.module('app.review').service('ReviewList', ['$q', '$http', '$translate', 'Exam', 'ExamRes', ReviewListService]);
