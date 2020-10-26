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
import { StateService } from 'angular-ui-router';
import * as toast from 'toastr';

import { Exam } from '../exam.model';

type ExamListExam = Exam & { expired: boolean; ownerAggregate: string };

export const ExamListingComponent: angular.IComponentOptions = {
    template: require('./examList.template.html'),
    controller: class ExamListingController implements angular.IComponentController {
        view: string;
        showExpired: boolean;
        examsPredicate: string;
        reverse: boolean;
        filter: { text: string };
        loader: { loading: boolean };
        executionTypes: { type: string; examinationTypes: { type: string; name: string }[] }[];
        byodExaminationSupported: boolean;
        exams: ExamListExam[];

        constructor(
            private dialogs: angular.dialogservice.IDialogService,
            private Exam: any,
            private $translate: angular.translate.ITranslateService,
            private $state: StateService,
            private $http: angular.IHttpService,
        ) {
            'ngInject';
        }

        $onInit = () => {
            this.view = 'PUBLISHED';
            this.showExpired = false;
            this.examsPredicate = 'examActiveEndDate';
            this.reverse = true;
            this.filter = { text: '' };
            this.loader = { loading: false };

            this.$http
                .get('/app/settings/byod')
                .then((resp: angular.IHttpResponse<{ isByodExaminationSupported: boolean }>) => {
                    const byodSupported = resp.data.isByodExaminationSupported;
                    this.Exam.listExecutionTypes().then(types => {
                        types.forEach(t => {
                            if (t.type !== 'PRINTOUT' && byodSupported) {
                                t.examinationTypes = [
                                    { type: 'AQUARIUM', name: 'sitnet_examination_type_aquarium' },
                                    { type: 'CLIENT_AUTH', name: 'sitnet_examination_type_seb' },
                                    { type: 'WHATEVER', name: 'sitnet_examination_type_home_exam' },
                                ];
                            } else {
                                t.examinationTypes = [];
                            }
                        });
                        this.executionTypes = types;
                    });
                });
        };

        search = () => {
            this.loader.loading = true;
            this.$http
                .get('/app/exams', { params: { filter: this.filter.text } })
                .then((resp: angular.IHttpResponse<ExamListExam[]>) => {
                    const exams = resp.data;
                    exams.forEach(e => {
                        e.ownerAggregate = e.examOwners.map(o => `${o.firstName} ${o.lastName}`).join();
                        if (e.state === 'PUBLISHED') {
                            e.expired = new Date() > new Date(e.examActiveEndDate);
                        } else {
                            e.expired = false;
                        }
                    });
                    this.exams = exams;
                })
                .catch(err => toast.error(this.$translate.instant(err.data)))
                .finally(() => (this.loader.loading = false));
        };

        createExam = executionType => this.Exam.createExam(executionType);

        copyExam = (exam: Exam, type: string, examinationType = 'AQUARIUM') =>
            this.$http
                .post('/app/exams', { id: exam.id, type: type, examinationType: examinationType })
                .then((resp: angular.IHttpResponse<Exam>) => {
                    toast.success(this.$translate.instant('sitnet_exam_copied'));
                    this.$state.go('examEditor', { id: resp.data.id, tab: 1 });
                })
                .catch(err => toast.error(err.data));

        deleteExam = (exam: ExamListExam) => {
            const dialog = this.dialogs.confirm(
                this.$translate.instant('sitnet_confirm'),
                this.$translate.instant('sitnet_remove_exam'),
            );
            dialog.result.then(() => {
                this.$http
                    .delete(`/app/exams/${exam.id}`)
                    .then(() => {
                        toast.success(this.$translate.instant('sitnet_exam_removed'));
                        this.exams.splice(this.exams.indexOf(exam), 1);
                    })
                    .catch(err => toast.error(err.data));
            });
        };

        getExecutionTypeTranslation = (exam: ExamListExam) =>
            this.Exam.getExecutionTypeTranslation(exam.executionType.type);
    },
};

angular.module('app.exam').component('examList', ExamListingComponent);
