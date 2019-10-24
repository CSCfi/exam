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
import { StateService } from '@uirouter/core';
import * as ng from 'angular';
import * as uib from 'angular-ui-bootstrap';
import * as toast from 'toastr';

import { LanguageInspection } from './maturity.model';

export interface QueryParams {
    text?: string;
    start?: number;
    end?: number;
}

export class LanguageInspectionService {
    constructor(
        private $http: ng.IHttpService,
        private $state: StateService,
        private $uibModal: uib.IModalService,
        private $translate: ng.translate.ITranslateService,
        private dialogs: angular.dialogservice.IDialogService,
    ) {
        'ngInject';
    }

    query(params: QueryParams): ng.IPromise<ng.IHttpResponse<LanguageInspection[]>> {
        return this.$http({
            url: '/app/inspections',
            method: 'GET',
            params: params,
        });
    }

    showStatement = (statement: { comment: string }) => {
        this.$uibModal
            .open({
                backdrop: 'static',
                keyboard: true,
                component: 'inspectionStatementDialog',
                resolve: {
                    statement: function() {
                        return statement.comment;
                    },
                },
            })
            .result.catch(angular.noop);
    };

    assignInspection = (inspection: LanguageInspection) => {
        const dialog = this.dialogs.confirm(
            this.$translate.instant('sitnet_confirm'),
            this.$translate.instant('sitnet_confirm_assign_inspection'),
        );
        dialog.result.then(() => {
            this.$http
                .put(`/app/inspection/${inspection.id}`, {})
                .then(() => this.$state.go('assessment', { id: inspection.exam.id }))
                .catch(err => toast.error(err.data));
        });
    };
}

angular.module('app.maturity').service('LanguageInspections', LanguageInspectionService);
