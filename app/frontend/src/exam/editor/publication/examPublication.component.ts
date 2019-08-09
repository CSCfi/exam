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

import * as angular from 'angular';
import * as moment from 'moment';
import * as toast from 'toastr';
import * as _ from 'lodash';

import { IModalService } from 'angular-ui-bootstrap';
import { Exam, ExaminationDate, AutoEvaluationConfig } from '../../exam.model';
import { SessionService, User } from '../../../session/session.service';


export const ExamPublicationComponent: angular.IComponentOptions = {
    template: require('./examPublication.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<',
        onPreviousTabSelected: '&',
        onNextTabSelected: '&?'
    },
    controller: class ExamPublicationController implements angular.IComponentController {

        exam: Exam;
        collaborative: boolean;
        onPreviousTabSelected: () => any;
        onNextTabSelected: () => any;

        user: User;
        hostName: string;
        autoevaluation: { enabled: boolean };
        examDurations: number[];

        constructor(
            private $http: angular.IHttpService,
            private $q: angular.IQService,
            private $translate: angular.translate.ITranslateService,
            private $location: angular.ILocationService,
            private $uibModal: IModalService,
            private Session: SessionService,
            private Exam: any
        ) {
            'ngInject';

            this.hostName = window.location.origin;
        }

        $onInit = () => {
            this.$http.get('/app/settings/durations').then(
                (response: angular.IHttpResponse<{ examDurations: number[] }>) => {
                    this.examDurations = response.data.examDurations;
                }).catch(angular.noop);
            this.user = this.Session.getUser();
            this.autoevaluation = {
                enabled: !!this.exam.autoEvaluationConfig
            };
        }

        addExaminationDate = (date: Date) => {
            const fmt = 'DD/MM/YYYY';
            const formattedDate = moment(date).format(fmt);
            const alreadyExists: boolean = this.exam.examinationDates
                .map((ed: { date: Date }) => moment(ed.date).format(fmt))
                .some((d: string) => d === formattedDate);
            if (!alreadyExists) {
                this.$http.post(`/app/exam/${this.exam.id}/examinationdate`, { date: formattedDate }).then(
                    (resp: angular.IHttpResponse<ExaminationDate>) =>
                        this.exam.examinationDates.push(resp.data)
                );
            }
        }

        removeExaminationDate = (date: ExaminationDate) => {
            this.$http.delete(`/app/exam/${this.exam.id}/examinationdate/${date.id}`).then(
                () => {
                    const i = this.exam.examinationDates.indexOf(date);
                    this.exam.examinationDates.splice(i, 1);
                }
            );
        }

        startDateChanged = (date: VarDate) => this.exam.examActiveStartDate = date;
        endDateChanged = (date: VarDate) => this.exam.examActiveEndDate = date;

        autoEvaluationConfigChanged = (config: AutoEvaluationConfig) =>
            angular.extend(this.exam.autoEvaluationConfig, config)

        canBeAutoEvaluated = () =>
            this.Exam.hasQuestions(this.exam) && !this.Exam.hasEssayQuestions(this.exam) &&
            this.exam.gradeScale && this.exam.executionType.type !== 'MATURITY'


        updateExam = (silent?: boolean, overrides?: any) => {
            const deferred = this.$q.defer();
            const config = {
                'evaluationConfig': this.autoevaluation.enabled && this.canBeAutoEvaluated() ? {
                    releaseType: this.exam.autoEvaluationConfig.releaseType.name,
                    releaseDate: this.exam.autoEvaluationConfig.releaseDate ?
                        new Date(this.exam.autoEvaluationConfig.releaseDate).getTime() : null,
                    amountDays: this.exam.autoEvaluationConfig.amountDays,
                    gradeEvaluations: this.exam.autoEvaluationConfig.gradeEvaluations
                } : null
            };
            angular.extend(config, overrides);
            this.Exam.updateExam(this.exam, config, this.collaborative).then(() => {
                if (!silent) {
                    toast.info(this.$translate.instant('sitnet_exam_saved'));
                }
                deferred.resolve();
            }, (err: string) => {
                toast.error(err);
                deferred.reject(err);
            });
            return deferred.promise;
        }

        setExamDuration = (duration: number) => {
            this.exam.duration = duration;
            this.updateExam();
        }

        checkDuration = (duration: number) => this.exam.duration === duration ? 'btn-primary' : '';

        range = (min: number, max: number, step = 1) => {
            const input: number[] = [];
            for (let i = min; i <= max; i += step) {
                input.push(i);
            }
            return input;
        }

        checkTrialCount = (x: number) => {
            return this.exam.trialCount === x ? 'btn-primary' : '';
        }

        setTrialCount = (x: number) => {
            this.exam.trialCount = x;
            this.updateExam();
        }

        previewExam = (fromTab: number) => {
            this.Exam.previewExam(this.exam, fromTab, this.collaborative);
        }

        nextTab = () => this.onNextTabSelected();
        previousTab = () => this.onPreviousTabSelected();

        saveAndPublishExam = () => {

            const errors: string[] = this.isDraftCollaborativeExam() ?
                this.errorsPreventingPrePublication() : this.errorsPreventingPublication();

            if (errors.length > 0) {
                this.$uibModal.open({
                    component: 'publicationErrorDialog',
                    backdrop: 'static',
                    keyboard: true,
                    resolve: {
                        errors: () => errors
                    }
                });
            } else {
                this.$uibModal.open({
                    component: 'publicationDialog',
                    backdrop: 'static',
                    keyboard: true,
                    resolve: {
                        exam: () => this.exam,
                        prePublication: () => this.isDraftCollaborativeExam()
                    }
                }).result.then(() => {
                    const state = {
                        'state': this.isDraftCollaborativeExam() ?
                            'PRE_PUBLISHED' : 'PUBLISHED'
                    };
                    // OK button clicked
                    this.updateExam(true, state).then(() => {
                        const text = this.isDraftCollaborativeExam()
                            ? 'sitnet_exam_saved_and_pre_published' : 'sitnet_exam_saved_and_published';
                        toast.success(this.$translate.instant(text));
                        this.$location.path('/');
                    }).catch(angular.noop);
                });
            }
        }

        isDraftCollaborativeExam = () => this.collaborative && this.exam.state === 'DRAFT';

        // TODO: how should this work when it comes to private exams?
        unpublishExam = () => {
            if (this.isAllowedToUnpublishOrRemove()) {
                this.$uibModal.open({
                    component: 'publicationRevokeDialog',
                    backdrop: 'static',
                    keyboard: true
                }).result.then(() => {
                    this.updateExam(true, { 'state': this.collaborative ? 'PRE_PUBLISHED' : 'DRAFT' }).then(() => {
                        toast.success(this.$translate.instant('sitnet_exam_unpublished'));
                        this.exam.state = 'DRAFT';
                    });
                }).catch(angular.noop);
            } else {
                toast.warning(this.$translate.instant('sitnet_unpublish_not_possible'));
            }
        }

        autoEvaluationDisabled = () => this.autoevaluation.enabled = false;
        autoEvaluationEnabled = () => this.autoevaluation.enabled = true;

        private isAllowedToUnpublishOrRemove = () =>
            // allowed if no upcoming reservations and if no one has taken this yet
            !this.exam.hasEnrolmentsInEffect && this.exam.children.length === 0


        private countQuestions = () =>
            this.exam.examSections.reduce((a, b) => a + b.sectionQuestions.length, 0)

        private hasDuplicatePercentages = () => {
            const percentages = this.exam.autoEvaluationConfig.gradeEvaluations.map(e => e.percentage).sort();
            for (let i = 0; i < percentages.length - 1; ++i) {
                if (percentages[i + 1] === percentages[i]) {
                    return true;
                }
            }
            return false;
        }

        private errorsPreventingPrePublication(): string[] {
            const errors: string[] = [];

            if (!this.exam.name || this.exam.name.length < 2) {
                errors.push('sitnet_exam_name_missing_or_too_short');
            }

            if (this.exam.examLanguages.length === 0) {
                errors.push('sitnet_error_exam_empty_exam_language');
            }

            const isPrintout = this.exam.executionType.type === 'PRINTOUT';
            if (!isPrintout && !this.exam.examActiveStartDate) {
                errors.push('sitnet_exam_start_date_missing');
            }

            if (!isPrintout && !this.exam.examActiveEndDate) {
                errors.push('sitnet_exam_end_date_missing');
            }
            if (isPrintout && this.exam.examinationDates.length === 0) {
                errors.push('sitnet_examination_date_missing');
            }
            if (!this.exam.duration) {
                errors.push('sitnet_exam_duration_missing');
            }

            if (!this.exam.gradeScale) {
                errors.push('sitnet_exam_grade_scale_missing');
            }

            if (!this.exam.examType) {
                errors.push('sitnet_exam_credit_type_missing');
            }
            if (this.exam.examOwners.length == 0) {
                errors.push('sitnet_exam_owner_missing');
            }

            return errors;

        }

        private errorsPreventingPublication(): string[] {

            const errors: string[] = this.errorsPreventingPrePublication();

            if (!this.exam.course && !this.collaborative) {
                errors.push('sitnet_course_missing');
            }

            if (this.countQuestions() === 0) {
                errors.push('sitnet_exam_has_no_questions');
            }

            const allSectionsNamed = this.exam.examSections.every((section) => {
                return !_.isEmpty(section.name);
            });
            if (!allSectionsNamed) {
                errors.push('sitnet_exam_contains_unnamed_sections');
            }

            if (['PRIVATE', 'MATURITY'].indexOf(this.exam.executionType.type) > -1 &&
                this.exam.examEnrolments.length < 1) {
                errors.push('sitnet_no_participants');
            }

            if (this.exam.executionType.type === 'MATURITY' &&
                !_.isBoolean(this.exam.subjectToLanguageInspection)) {
                errors.push('sitnet_language_inspection_setting_not_chosen');
            }

            if (this.autoevaluation.enabled && this.hasDuplicatePercentages()) {
                errors.push('sitnet_autoevaluation_percentages_not_unique');
            }

            return errors.map(e => this.$translate.instant(e));
        }

    }
};


angular.module('app.exam.editor').component('examPublication', ExamPublicationComponent);
