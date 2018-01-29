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

angular.module('app.review')
    .service('ReviewList', ['$q', '$translate', 'Exam', 'ExamRes',
        function ($q, $translate, Exam, ExamRes) {

            const self = this;

            self.gradeExam = function (exam) {
                if (!exam.grade || !exam.grade.id) {
                    exam.grade = {};
                }
                if (!exam.selectedGrade) {
                    exam.selectedGrade = {};
                }
                const scale = exam.gradeScale || exam.parent.gradeScale || exam.course.gradeScale;
                scale.grades = scale.grades || [];
                exam.selectableGrades = scale.grades.map(function (grade) {
                    grade.type = grade.name;
                    grade.name = Exam.getExamGradeDisplayName(grade.name);
                    if (exam.grade && exam.grade.id === grade.id) {
                        exam.grade.type = grade.type;
                        exam.selectedGrade = grade;
                    }
                    return grade;
                });
                const noGrade = {type: 'NONE', name: Exam.getExamGradeDisplayName('NONE')};
                if (exam.gradeless && !exam.selectedGrade) {
                    exam.selectedGrade = noGrade;
                }
                exam.selectableGrades.push(noGrade);
            };

            self.filterReview = function (filter, review) {
                if (!filter) {
                    return true;
                }
                const s = filter.toLowerCase();
                const name = _.get(review, 'user.firstName', '') + ' ' + _.get(review, 'user.lastName', '');
                return name.toLowerCase().indexOf(s) > -1
                    || _.get(review, 'user.email', '').toLowerCase().indexOf(s) > -1;
            };

            self.filterByState = function (reviews, states) {
                return reviews.filter(function (r) {
                    return states.indexOf(r.exam.state) > -1;
                });
            };

            self.prepareView = function (items, setup) {
                items.forEach(setup);
                return {
                    items: items,
                    filtered: items,
                    toggle: items.length > 0,
                    pageSize: 30
                };
            };

            self.applyFilter = function (filter, items) {
                if (!filter) {
                    return items;
                }
                return items.filter(function (i) {
                    return self.filterReview(filter, i);
                });
            };

            const getSelectedReviews = function (items) {
                const objects = items.filter(function (i) {
                    return i.selected;
                });
                if (objects.length === 0) {
                    toast.warning($translate.instant('sitnet_choose_atleast_one'));
                    return;
                }
                return objects;
            };

            self.sendSelectedToRegistry = function (data) {
                const selection = getSelectedReviews(data);
                if (!selection) {
                    return;
                }
                const dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_record_review'));

                dialog.result.then(function (btn) {
                    const promises = [];
                    selection.forEach(function (r) {
                        promises.push(send(r));
                    });
                    $q.all(promises).then(function () {
                        toast.info($translate.instant('sitnet_results_send_ok'));
                    });
                });
            };

            const resetSelections = function (scope, view) {
                let prev, next;
                for (let k in scope) {
                    if (scope.hasOwnProperty(k)) {
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

            self.selectAll = function (scope, items) {
                const override = resetSelections(scope, 'all');
                items.forEach(function (i) {
                    i.selected = !i.selected || override;
                });
            };

            self.selectPage = function (scope, items, selector) {
                const override = resetSelections(scope, 'page');
                const boxes = angular.element('.' + selector);
                const ids = [];
                angular.forEach(boxes, function (input) {
                    ids.push(parseInt(angular.element(input).val()));
                });
                // init all as not selected
                if (override) {
                    items.forEach(function (i) {
                        i.selected = false;
                    });
                }
                const pageItems = items.filter(function (i) {
                    return ids.indexOf(i.exam.id) > -1;
                });
                pageItems.forEach(function (pi) {
                    pi.selected = !pi.selected || override;
                });
            };

            self.getSelectedReviews = function (items) {
                const objects = items.filter(function (i) {
                    return i.selected;
                });
                if (objects.length === 0) {
                    toast.warning($translate.instant('sitnet_choose_atleast_one'));
                    return;
                }
                return objects;
            };

            self.sendToRegistry = function (review) {
                const deferred = $q.defer();
                const exam = review.exam;
                const resource = exam.gradeless ? ExamRes.register : ExamRes.saveRecord;
                if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
                    const examToRecord = {
                        'id': exam.id,
                        'state': 'GRADED_LOGGED',
                        'grade': exam.grade,
                        'customCredit': exam.customCredit,
                        'totalScore': exam.totalScore,
                        'creditType': exam.creditType,
                        'sendFeedback': true,
                        'answerLanguage': exam.answerLanguage
                    };

                    resource.add(examToRecord, function () {
                        deferred.resolve();
                    });
                } else {
                    toast.error($translate.instant('sitnet_failed_to_record_review'));
                    deferred.reject();
                }
                return deferred.promise;
            };


        }]);

