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
import * as toast from 'toastr';

export const LibraryTransferComponent: angular.IComponentOptions = {
    template: require('./libraryTransfer.template.html'),
    bindings: {
        selections: '<',
    },
    controller: class LibraryTransferController implements angular.IComponentController {
        selections: number[];
        organisations: any[];
        organisation: any;

        constructor(private $http: angular.IHttpService, private $translate: angular.translate.ITranslateService) {
            'ngInject';
        }

        $onInit() {
            this.$http.get('/integration/iop/organisations').then((resp: ng.IHttpResponse<any[]>) => {
                this.organisations = resp.data.filter(org => !org.homeOrg);
            });
        }

        transfer = () => {
            if (this.selections.length == 0) {
                toast.warning(this.$translate.instant('sitnet_choose_atleast_one'));
            } else {
                this.$http
                    .post('/integration/iop/export', {
                        type: 'QUESTION',
                        orgRef: this.organisation._id,
                        ids: this.selections,
                    })
                    .then(() => toast.info(this.$translate.instant('sitnet_questions_transferred')))
                    .catch(err => toast.error(err.data));
            }
        };
    },
};

angular.module('app.question').component('libraryTransfer', LibraryTransferComponent);
