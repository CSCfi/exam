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
import { SessionService, User } from '../../../session/session.service';
import { Exam } from '../../exam.model';

export const CollaborativeExamOwnerSelectorComponent: angular.IComponentOptions = {
    template: require('./collaborativeExamOwnerSelector.template.html'),
    bindings: {
        exam: '<'
    },
    controller: class CollaborativeExamOwnerSelectorController implements angular.IComponentController {
        exam: Exam;
        user: User;
        newOwner: { email: string | null };

        constructor(
            private $http: angular.IHttpService,
            private $translate: angular.translate.ITranslateService,
            private Session: SessionService) {
            'ngInject';

            this.newOwner = { email: null };
        }

        $onInit = () => {
            this.user = this.Session.getUser();
        }

        addOwner = () => {
            const exists = this.exam.examOwners.some(o => o.email === this.newOwner.email);
            if (!exists) {
                this.$http.post(`/integration/iop/exams/${this.exam.id}/owners`, this.newOwner).then(
                    (response: angular.IHttpResponse<User>) => {
                        this.exam.examOwners.push(response.data);
                        delete this.newOwner.email;
                    }
                ).catch(resp => toast.error(resp.data));
            }
        }

        removeOwner = (id: number) => {
            this.$http.delete(`/integration/iop/exams/${this.exam.id}/owners/${id}`).then(
                () => this.exam.examOwners = this.exam.examOwners.filter(o => o.id !== id)
            ).catch(resp => toast.error(resp.data));
        }

    }

};

angular.module('app.exam.editor').component('collaborativeExamOwnerSelector', CollaborativeExamOwnerSelectorComponent);

