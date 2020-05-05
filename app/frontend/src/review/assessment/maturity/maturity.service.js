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

angular.module('app.review').service('Maturity', [
    '$q',
    '$resource',
    '$location',
    '$translate',
    'dialogs',
    'Assessment',
    'Session',
    'ExamRes',
    function($q, $resource, $location, $translate, dialogs, Assessment, Session, ExamRes) {
        const self = this;

        const inspectionApi = $resource('/app/inspection', null, { add: { method: 'POST' } });
        const approvalApi = $resource('/app/inspection/:id/approval', { id: '@id' }, { update: { method: 'PUT' } });
        const statementApi = $resource('/app/inspection/:id/statement', { id: '@id' }, { update: { method: 'PUT' } });

        const canFinalizeInspection = function(exam) {
            return exam.languageInspection.statement && exam.languageInspection.statement.comment;
        };

        const isUnderLanguageInspection = function(exam) {
            return (
                Session.getUser().isLanguageInspector && exam.languageInspection && !exam.languageInspection.finishedAt
            );
        };

        const isMissingStatement = function(exam) {
            if (!isUnderLanguageInspection(exam)) {
                return false;
            }
            return !exam.languageInspection.statement || !exam.languageInspection.statement.comment;
        };

        const isMissingFeedback = function(exam) {
            return !exam.examFeedback || !exam.examFeedback.comment;
        };

        const isAwaitingInspection = function(exam) {
            return exam.languageInspection && !exam.languageInspection.finishedAt;
        };

        const MATURITY_STATES = {
            NOT_REVIEWED: { id: 1, text: 'sitnet_not_reviewed' },
            REJECT_STRAIGHTAWAY: { id: 2, text: 'sitnet_reject_maturity', canProceed: true, warn: true },
            LANGUAGE_INSPECT: { id: 3, text: 'sitnet_send_for_language_inspection', canProceed: true },
            AWAIT_INSPECTION: { id: 4, text: 'sitnet_await_inspection' },
            REJECT_LANGUAGE: {
                id: 5,
                text: 'sitnet_reject_maturity',
                canProceed: true,
                warn: true,
                validate: canFinalizeInspection,
                showHint: isMissingStatement,
                hint: 'sitnet_missing_statement',
            },
            APPROVE_LANGUAGE: {
                id: 6,
                text: 'sitnet_approve_maturity',
                canProceed: true,
                validate: canFinalizeInspection,
                showHint: isMissingStatement,
                hint: 'sitnet_missing_statement',
            },
            MISSING_STATEMENT: { id: 9, text: 'sitnet_missing_statement' },
        };
        MATURITY_STATES.APPROVE_LANGUAGE.alternateState = MATURITY_STATES.REJECT_LANGUAGE;

        const isGraded = function(exam) {
            return exam.grade;
        };

        self.isMissingStatement = function(exam) {
            return isMissingStatement(exam);
        };

        self.saveInspectionStatement = function(exam) {
            const deferred = $q.defer();
            const statement = {
                id: exam.languageInspection.id,
                comment: exam.languageInspection.statement.comment,
            };
            // Update comment
            statementApi.update(
                statement,
                function(data) {
                    toast.info($translate.instant('sitnet_statement_updated'));
                    deferred.resolve(data);
                },
                function(error) {
                    toast.error(error.data);
                    deferred.reject(error.data);
                },
            );
            return deferred.promise;
        };

        self.getNextState = function(exam) {
            if (!isGraded(exam)) {
                return MATURITY_STATES.NOT_REVIEWED;
            }
            if (isMissingFeedback(exam)) {
                return MATURITY_STATES.MISSING_STATEMENT;
            }
            if (isUnderLanguageInspection(exam)) {
                return MATURITY_STATES.APPROVE_LANGUAGE;
            }
            if (isAwaitingInspection(exam)) {
                return MATURITY_STATES.AWAIT_INSPECTION;
            }
            const grade = exam.grade;
            const disapproved = !grade || grade.marksRejection;

            return disapproved ? MATURITY_STATES.REJECT_STRAIGHTAWAY : MATURITY_STATES.LANGUAGE_INSPECT;
        };

        self.proceed = function(exam, alternate) {
            let state = self.getNextState(exam);
            if (state.alternateState && alternate) {
                state = state.alternateState;
            }
            switch (state.id) {
                case MATURITY_STATES.REJECT_STRAIGHTAWAY.id:
                    Assessment.rejectMaturity(exam);
                    break;
                case MATURITY_STATES.LANGUAGE_INSPECT.id:
                    sendForLanguageInspection(exam);
                    break;
                case MATURITY_STATES.REJECT_LANGUAGE.id:
                    finalizeLanguageInspection(exam, true);
                    break;
                case MATURITY_STATES.APPROVE_LANGUAGE.id:
                    finalizeLanguageInspection(exam);
                    break;
                case MATURITY_STATES.AWAIT_INSPECTION.id:
                    // Nothing to do
                    break;
                default:
                    // Nothing to do
                    break;
            }
        };

        const sendForLanguageInspection = function(exam) {
            const dialog = dialogs.confirm(
                $translate.instant('sitnet_confirm'),
                $translate.instant('sitnet_confirm_maturity_approval'),
            );
            dialog.result.then(function() {
                Assessment.saveFeedback(exam).then(function() {
                    const params = Assessment.getPayload(exam, 'GRADED');
                    ExamRes.review.update(
                        { id: exam.id },
                        params,
                        function() {
                            inspectionApi.add({ examId: exam.id }, function() {
                                toast.info($translate.instant('sitnet_sent_for_language_inspection'));
                                $location.path(Assessment.getExitUrl(exam));
                            });
                        },
                        function(error) {
                            toast.error(error.data);
                        },
                    );
                });
            });
        };

        const finalizeLanguageInspection = function(exam, reject) {
            const dialog = dialogs.confirm(
                $translate.instant('sitnet_confirm'),
                $translate.instant('sitnet_confirm_language_inspection_approval'),
            );
            dialog.result.then(function() {
                const approved = !reject;
                self.saveInspectionStatement(exam).then(function() {
                    approvalApi.update({ id: exam.languageInspection.id, approved: approved }, function() {
                        toast.info($translate.instant('sitnet_language_inspection_finished'));
                        if (approved) {
                            Assessment.createExamRecord(exam, false, 'inspections');
                        } else {
                            Assessment.rejectMaturity(exam, false, 'inspections');
                        }
                    });
                });
            });
        };
    },
]);
