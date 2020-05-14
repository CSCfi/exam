/*
 * Copyright (c) 2018 Exam Consortium
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
import { DateTimeService } from '../../../utility/date/date.service';
import { SessionService } from '../../../session/session.service';
import { IHttpResponse } from 'angular';
import { StateService } from '@uirouter/core';

export const ExamListCategoryComponent: ng.IComponentOptions = {
    template: require('./examListCategory.template.html'),
    bindings: {
        items: '<',
        examTypes: '<',
        extraColumns: '<?',
        defaultPredicate: '@',
        defaultReverse: '<?',
        onFilterChange: '&',
    },
    controller: class ExamListCategoryController implements ng.IComponentController {
        items: any[];
        examTypes: any[];
        extraColumns: any[] = [];
        defaultPredicate: string;
        defaultReverse: boolean;
        onFilterChange: (_: { text: string }) => void;

        userId: number;
        pageSize = 10;
        sorting: {
            predicate: string;
            reverse: boolean;
        };
        filterText: string;

        constructor(
            private $http: ng.IHttpService,
            private $translate: ng.translate.ITranslateService,
            private $location: ng.ILocationService, // TODO: maybe use states?
            private $state: StateService,
            private dialogs: angular.dialogservice.IDialogService,
            private Exam: any, // TBD
            private DateTime: DateTimeService,
            private Session: SessionService,
        ) {
            'ngInject';
        }

        $onInit() {
            this.userId = this.Session.getUser().id;
            this.sorting = {
                predicate: this.defaultPredicate,
                reverse: this.defaultReverse,
            };
            this.filterText = this.$location.search().filter;
            if (this.filterText) {
                this.search();
            }
        }

        search() {
            this.$location.search('filter', this.filterText);
            this.onFilterChange({ text: this.filterText });
        }

        printExamDuration(exam) {
            return this.DateTime.printExamDuration(exam);
        }

        getUsername = () => this.Session.getUserName();

        getExecutionTypeTranslation = exam => {
            const type = this.Exam.getExecutionTypeTranslation(exam.executionType.type);
            const impl = this.Exam.getExamImplementationTranslation(exam.implementation);
            return `${this.$translate.instant(type)} - ${this.$translate.instant(impl)}`;
        };

        copyExam(exam, type) {
            this.$http
                .post(`/app/exams/${exam.id}`, { type: type })
                .then((resp: IHttpResponse<{ id: number }>) => {
                    toast.success(this.$translate.instant('sitnet_exam_copied'));
                    this.$state.go('examEditor', { id: resp.data.id, tab: 1 });
                })
                .catch(resp => toast.error(resp.data));
        }

        deleteExam(exam) {
            const dialog = this.dialogs.confirm(
                this.$translate.instant('sitnet_confirm'),
                this.$translate.instant('sitnet_remove_exam'),
            );
            dialog.result.then(() => {
                this.$http
                    .delete(`/app/exams/${exam.id}`)
                    .then(() => {
                        toast.success(this.$translate.instant('sitnet_exam_removed'));
                        this.items.splice(this.items.indexOf(exam), 1);
                    })
                    .catch(resp => toast.error(resp.data));
            });
        }

        isOwner = exam => exam.examOwners.some(eo => eo.id === this.userId);
    },
};
