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
/// <reference types="angular-dialog-service" />

import * as ng from 'angular';
import * as toast from 'toastr';
import { SessionService } from '../../../session/session.service';
import { Exam, ExamSection } from '../../exam.model';



export const SectionsListComponent: ng.IComponentOptions = {
    template: require('./sectionsList.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<',
        onNextTabSelected: '&',
        onPreviousTabSelected: '&',
        onNewLibraryQuestion: '&'
    },
    controller: class SectionsListComponentController implements ng.IComponentController {
        exam: Exam;
        collaborative: boolean;
        onPreviousTabSelected: () => any;
        onNextTabSelected: () => any;
        onNewLibraryQuestion: () => any;

        constructor(
            private $http: ng.IHttpService,
            private $q: ng.IQService,
            private $translate: ng.translate.ITranslateService,
            private $location: ng.ILocationService,
            private dialogs: angular.dialogservice.IDialogService,
            private Exam: any,
            private Session: SessionService
        ) {
            'ngInject';
        }

        private init = () => {
            this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
            this.updateSectionIndices();
        }

        private updateSectionIndices = () => {
            // set sections and question numbering
            ng.forEach(this.exam.examSections, (section, index) => section.index = index + 1);
        }

        $onInit = () => {
            this.init();
        }

        $onChanges = (changes: ng.IOnChangesObject) => {
            if (changes.exam) {
                this.init();
            }
        }

        moveSection = (section: ExamSection, from: number, to: number) => {
            if (from >= 0 && to >= 0 && from !== to) {
                this.$http.put(this.Exam.getResource(`/app/exams/${this.exam.id}/reorder`, this.collaborative),
                    { from: from, to: to }).then(
                        resp => {
                            this.updateSectionIndices();
                            toast.info(this.$translate.instant('sitnet_sections_reordered'));
                        }).catch(resp => toast.error(resp.data));
            }
        }

        addNewSection = () => {
            this.$http.post(this.Exam.getResource(`/app/exams/${this.exam.id}/sections`, this.collaborative), {})
                .then((resp: ng.IHttpResponse<ExamSection>) => {
                    toast.success(this.$translate.instant('sitnet_section_added'));
                    this.exam.examSections.push(resp.data);
                    this.updateSectionIndices();
                }).catch(resp => toast.error(resp.data));
        }

        updateExam = (silent: boolean) => {
            const deferred: ng.IDeferred<void> = this.$q.defer();
            this.Exam.updateExam(this.exam, {}, this.collaborative).then(() => {
                if (!silent) {
                    toast.info(this.$translate.instant('sitnet_exam_saved'));
                }
                deferred.resolve();
            }, (error) => {
                if (error.data) {
                    const msg = error.data.message || error.data;
                    toast.error(this.$translate.instant(msg));
                }
                deferred.reject();
            });
            return deferred.promise;
        }

        previewExam = (fromTab: number) => {
            this.Exam.previewExam(this.exam, fromTab, this.collaborative);
        }

        removeExam = () => {
            this.Exam.removeExam(this.exam, this.collaborative);
        }

        removeSection = (section: ExamSection) => {
            this.$http.delete(this.Exam.getResource(`/app/exams/${this.exam.id}/sections/${section.id}`))
                .then(() => {
                    toast.info(this.$translate.instant('sitnet_section_removed'));
                    this.exam.examSections.splice(this.exam.examSections.indexOf(section), 1);
                    this.updateSectionIndices();
                }).catch(resp => toast.error(resp.data));
        }

        calculateExamMaxScore = () => this.Exam.getMaxScore(this.exam);

        nextTab = () => this.onNextTabSelected();

        previousTab = () => this.onPreviousTabSelected();

        showDelete = () => {
            if (this.collaborative) {
                return this.Session.getUser().isAdmin;
            }
            return this.exam.executionType.type === 'PUBLIC';
        }

        onReloadRequired = () => this.onNewLibraryQuestion();

    }
};

angular.module('app.exam.editor').component('sections', SectionsListComponent);
