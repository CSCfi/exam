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

angular.module('app.exam').service('Exam', [
    '$translate',
    '$q',
    '$state',
    '$http',
    'ExamRes',
    'Question',
    'Session',
    'dialogs',
    function($translate, $q, $state, $http, ExamRes, Question, Session, dialogs) {
        const self = this;

        self.getReviewablesCount = function(exam) {
            return exam.children.filter(function(child) {
                return child.state === 'REVIEW' || child.state === 'REVIEW_STARTED';
            }).length;
        };

        self.getGradedCount = function(exam) {
            return exam.children.filter(function(child) {
                return child.state === 'GRADED';
            }).length;
        };

        self.getProcessedCount = function(exam) {
            return exam.children.filter(function(child) {
                return ['REVIEW', 'REVIEW_STARTED', 'GRADED'].indexOf(child.state) === -1;
            }).length;
        };

        self.createExam = function(executionType) {
            ExamRes.draft.create(
                { executionType: executionType },
                function(response) {
                    toast.info($translate.instant('sitnet_exam_added'));
                    //return response.id;
                    $state.go('courseSelector', { id: response.id });
                },
                function(error) {
                    toast.error(error.data);
                },
            );
        };

        self.updateExam = function(exam, overrides, collaborative) {
            const data = {
                id: exam.id,
                name: exam.name || '',
                examType: exam.examType,
                instruction: exam.instruction || '',
                enrollInstruction: exam.enrollInstruction || '',
                state: exam.state,
                shared: exam.shared,
                examActiveStartDate: exam.examActiveStartDate
                    ? new Date(exam.examActiveStartDate).getTime()
                    : undefined,
                examActiveEndDate: exam.examActiveEndDate
                    ? new Date(exam.examActiveEndDate).setHours(23, 59, 59, 999)
                    : undefined,
                duration: exam.duration,
                grading: exam.gradeScale ? exam.gradeScale.id : undefined,
                expanded: exam.expanded,
                trialCount: exam.trialCount || undefined,
                subjectToLanguageInspection: exam.subjectToLanguageInspection,
                internalRef: exam.internalRef,
                objectVersion: exam.objectVersion,
                attachment: exam.attachment,
                anonymous: exam.anonymous,
                implementation: exam.implementation,
                settingsPassword: exam.settingsPassword,
            };
            for (const k in overrides) {
                if (overrides.hasOwnProperty(k)) {
                    data[k] = overrides[k];
                }
            }
            const url = collaborative ? '/integration/iop/exams' : '/app/exams';
            const deferred = $q.defer();
            $http
                .put(`${url}/${exam.id}`, data)
                .then(function(response) {
                    deferred.resolve(response.data);
                })
                .catch(function(response) {
                    deferred.reject(response.data);
                });
            return deferred.promise;
        };

        self.getExamTypeDisplayName = function(type) {
            let name;
            switch (type) {
                case 'PARTIAL':
                    name = $translate.instant('sitnet_exam_credit_type_partial');
                    break;
                case 'FINAL':
                    name = $translate.instant('sitnet_exam_credit_type_final');
                    break;
                default:
                    break;
            }
            return name;
        };

        self.getExamGradeDisplayName = function(grade) {
            let name;
            switch (grade) {
                case 'NONE':
                    name = $translate.instant('sitnet_no_grading');
                    break;
                case 'I':
                    name = 'Improbatur';
                    break;
                case 'A':
                    name = 'Approbatur';
                    break;
                case 'B':
                    name = 'Lubenter approbatur';
                    break;
                case 'N':
                    name = 'Non sine laude approbatur';
                    break;
                case 'C':
                    name = 'Cum laude approbatur';
                    break;
                case 'M':
                    name = 'Magna cum laude approbtur';
                    break;
                case 'E':
                    name = 'Eximia cum laude approbatur';
                    break;
                case 'L':
                    name = 'Laudatur approbatur';
                    break;
                case 'REJECTED':
                    name = $translate.instant('sitnet_rejected');
                    break;
                case 'APPROVED':
                    name = $translate.instant('sitnet_approved');
                    break;
                default:
                    name = grade;
                    break;
            }
            return name;
        };

        self.refreshExamTypes = function() {
            const deferred = $q.defer();
            ExamRes.examTypes.query(function(examTypes) {
                return deferred.resolve(
                    examTypes.map(function(examType) {
                        examType.name = self.getExamTypeDisplayName(examType.type);
                        return examType;
                    }),
                );
            });
            return deferred.promise;
        };

        self.getScaleDisplayName = function(type) {
            let name;
            const description = type.description || type;
            switch (description) {
                case 'ZERO_TO_FIVE':
                    name = '0-5';
                    break;
                case 'LATIN':
                    name = 'Improbatur-Laudatur';
                    break;
                case 'APPROVED_REJECTED':
                    name = $translate.instant('sitnet_evaluation_select');
                    break;
                case 'OTHER':
                    name = type.displayName || type;
            }
            return name;
        };

        self.refreshGradeScales = function(isCollaborative) {
            const deferred = $q.defer();
            const url = isCollaborative ? '/integration/iop/gradescales' : '/app/gradescales';
            $http.get(url).then(resp => {
                return deferred.resolve(
                    resp.data.map(function(scale) {
                        scale.name = self.getScaleDisplayName(scale);
                        return scale;
                    }),
                );
            });
            return deferred.promise;
        };

        self.setCredit = function(exam) {
            if (self.hasCustomCredit(exam)) {
                exam.credit = exam.customCredit;
            } else {
                exam.credit = exam.course && exam.course.credits ? exam.course.credits : 0;
            }
        };

        self.listExecutionTypes = function() {
            const deferred = $q.defer();
            ExamRes.executionTypes.query(
                function(types) {
                    types.forEach(function(t) {
                        if (t.type === 'PUBLIC') {
                            t.name = 'sitnet_public_exam';
                        }
                        if (t.type === 'PRIVATE') {
                            t.name = 'sitnet_private_exam';
                        }
                        if (t.type === 'MATURITY') {
                            t.name = 'sitnet_maturity';
                        }
                        if (t.type === 'PRINTOUT') {
                            t.name = 'sitnet_printout_exam';
                        }
                    });
                    return deferred.resolve(types);
                },
                function() {
                    deferred.reject();
                },
            );
            return deferred.promise;
        };

        self.getExecutionTypeTranslation = function(type) {
            let translation;
            if (type === 'PUBLIC') {
                translation = 'sitnet_public_exam';
            }
            if (type === 'PRIVATE') {
                translation = 'sitnet_private_exam';
            }
            if (type === 'MATURITY') {
                translation = 'sitnet_maturity';
            }
            if (type === 'PRINTOUT') {
                translation = 'sitnet_printout_exam';
            }
            return translation;
        };

        self.getExamImplementationTranslation = function(impl) {
            let translation;
            if (impl === 'AQUARIUM') {
                translation = 'sitnet_examination_type_aquarium';
            }
            if (impl === 'CLIENT_AUTH') {
                translation = 'sitnet_examination_type_seb';
            }
            if (impl === 'WHATEVER') {
                translation = 'sitnet_examination_type_home_exam';
            }
            return translation;
        };

        function isInteger(n) {
            return typeof n === 'number' && isFinite(n) && Math.floor(n) === n;
        }

        self.getSectionTotalScore = function(section) {
            let score = 0;

            section.sectionQuestions.forEach(function(sq) {
                switch (sq.question.type) {
                    case 'MultipleChoiceQuestion':
                        score += Question.scoreMultipleChoiceAnswer(sq);
                        break;
                    case 'WeightedMultipleChoiceQuestion':
                        score += Question.scoreWeightedMultipleChoiceAnswer(sq);
                        break;
                    case 'ClozeTestQuestion':
                        score += Question.scoreClozeTestAnswer(sq);
                        break;
                    case 'EssayQuestion':
                        if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Points') {
                            const number = parseFloat(sq.essayAnswer.evaluatedScore);
                            if (angular.isNumber(number)) {
                                score += number;
                            }
                        }
                        break;
                    case 'ClaimChoiceQuestion':
                        score += Question.scoreClaimChoiceAnswer(sq);
                        break;
                    default:
                        break;
                }
            });

            return isInteger(score) ? score : parseFloat(score.toFixed(2));
        };

        self.getSectionMaxScore = function(section) {
            let score = 0;
            section.sectionQuestions.forEach(function(sq) {
                if (!sq || !sq.question) {
                    return;
                }
                switch (sq.question.type) {
                    case 'MultipleChoiceQuestion':
                    case 'ClozeTestQuestion':
                        score += sq.maxScore;
                        break;
                    case 'WeightedMultipleChoiceQuestion':
                        score += Question.calculateMaxPoints(sq);
                        break;
                    case 'EssayQuestion':
                        if (sq.evaluationType === 'Points') {
                            score += sq.maxScore;
                        }
                        break;
                    case 'ClaimChoiceQuestion':
                        score += Question.getCorrectClaimChoiceOptionScore(sq);
                        break;
                    default:
                        break;
                }
            });
            if (section.lotteryOn) {
                score = (score * section.lotteryItemCount) / Math.max(1, section.sectionQuestions.length);
            }

            return isInteger(score) ? score : parseFloat(score.toFixed(2));
        };

        self.hasQuestions = function(exam) {
            if (!exam || !exam.examSections) {
                return false;
            }
            return (
                exam.examSections.reduce(function(a, b) {
                    return a + b.sectionQuestions.length;
                }, 0) > 0
            );
        };

        self.hasEssayQuestions = function(exam) {
            if (!exam || !exam.examSections) {
                return false;
            }
            return (
                exam.examSections.filter(function(es) {
                    return es.sectionQuestions.some(function(sq) {
                        return sq.question.type === 'EssayQuestion';
                    });
                }).length > 0
            );
        };

        self.getMaxScore = function(exam) {
            if (!exam || !exam.examSections) {
                return 0;
            }
            let total = 0;
            exam.examSections.forEach(function(section) {
                total += self.getSectionMaxScore(section);
            });
            return total;
        };

        self.getTotalScore = function(exam) {
            if (!exam || !exam.examSections) {
                return 0;
            }
            let total = 0;
            exam.examSections.forEach(function(section) {
                total += self.getSectionTotalScore(section);
            });
            return Math.max(total.toFixed(2), 0.0);
        };

        self.isOwner = function(exam, collaborative) {
            const user = Session.getUser();
            const examToCheck = exam && exam.parent ? exam.parent : exam;
            return (
                examToCheck &&
                examToCheck.examOwners.filter(function(o) {
                    return o.id === user.id || (collaborative && (o.eppn === user.eppn || o.email === user.email));
                }).length > 0
            );
        };

        self.isOwnerOrAdmin = function(exam, collaborative) {
            const user = Session.getUser();
            return exam && user && (user.isAdmin || self.isOwner(exam, collaborative));
        };

        self.removeExam = function(exam, collaborative = false) {
            if (self.isAllowedToUnpublishOrRemove(exam, collaborative)) {
                const dialog = dialogs.confirm(
                    $translate.instant('sitnet_confirm'),
                    $translate.instant('sitnet_remove_exam'),
                );
                dialog.result
                    .then(() => {
                        $http
                            .delete(self.getResource(`/app/exams/${exam.id}`, collaborative))
                            .then(() => {
                                toast.success($translate.instant('sitnet_exam_removed'));
                                $state.go('dashboard');
                            })
                            .catch(resp => toast.error(resp.data));
                    })
                    .catch(angular.noop);
            } else {
                toast.warning($translate.instant('sitnet_exam_removal_not_possible'));
            }
        };

        self.getResource = function(url, collaborative = false) {
            return collaborative ? url.replace('/app/exams/', '/integration/iop/exams/') : url;
        };

        self.isAllowedToUnpublishOrRemove = function(exam, collaborative = false) {
            if (collaborative) {
                return Session.getUser().isAdmin && (exam.state === 'DRAFT' || exam.state === 'PRE_PUBLISHED');
            }
            // allowed if no upcoming reservations and if no one has taken this yet
            return !exam.hasEnrolmentsInEffect && (!exam.children || exam.children.length === 0);
        };

        self.previewExam = function(exam, fromTab, collaborative) {
            const params = { id: exam.id, tab: fromTab };
            if (collaborative) {
                $state.go('collaborativePreview', params);
            } else if (exam.executionType.type === 'PRINTOUT') {
                $state.go('printout', params);
            } else {
                $state.go('examPreview', params);
            }
        };

        self.hasCustomCredit = exam => {
            return _.isNumber(exam.customCredit) && exam.customCredit >= 0;
        };

        self.getExamDisplayCredit = exam => {
            const courseCredit = exam.course ? exam.course.credits : 0;
            return self.hasCustomCredit(exam) ? exam.customCredit : courseCredit;
        };

        self.addExaminationEvent = (examId, config) => {
            return $q((resolve, reject) => {
                $http
                    .post(`/app/exam/${examId}/examinationevents`, config)
                    .then(resp => {
                        toast.info($translate.instant('sitnet_saved'));
                        resolve(resp.data);
                    })
                    .catch(reject);
            });
        };

        self.updateExaminationEvent = (examId, config) => {
            return $q((resolve, reject) => {
                $http
                    .put(`/app/exam/${examId}/examinationevents/${config.id}`, config)
                    .then(resp => {
                        toast.info($translate.instant('sitnet_saved'));
                        resolve(resp.data);
                    })
                    .catch(reject);
            });
        };

        self.removeExaminationEvent = (examId, config) => {
            return $q((resolve, reject) => {
                $http
                    .delete(`/app/exam/${examId}/examinationevents/${config.id}`)
                    .then(resp => {
                        toast.info($translate.instant('sitnet_saved'));
                        resolve(resp.data);
                    })
                    .catch(reject);
            });
        };
    },
]);
