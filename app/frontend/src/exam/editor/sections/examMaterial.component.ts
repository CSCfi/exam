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

import * as ng from 'angular';
import * as toast from 'toastr';
import { ExamMaterial } from '../../exam.model';

export const ExamMaterialComponent: ng.IComponentOptions = {
    template: require('./examMaterial.template.html'),
    bindings: {
        close: '&',
    },
    controller: class ExamMaterialController implements ng.IComponentController {
        close: () => any;
        materials: ExamMaterial[] = [];
        newMaterial: ExamMaterial;
        filter: string;
        materialsChanged: boolean;

        constructor(private $http: ng.IHttpService) {
            'ngInject';
        }

        $onInit() {
            this.$http
                .get('/app/materials')
                .then((resp: ng.IHttpResponse<ExamMaterial[]>) => (this.materials = resp.data))
                .catch(angular.noop);
        }

        createMaterial = () => {
            this.$http
                .post('/app/materials', this.newMaterial)
                .then((resp: ng.IHttpResponse<ExamMaterial>) => {
                    this.materials.push(resp.data);
                    delete this.newMaterial;
                    this.materialsChanged = true;
                })
                .catch(err => toast.error(err));
        };

        removeMaterial = (material: ExamMaterial) => {
            this.$http
                .delete(`/app/materials/${material.id}`)
                .then(() => {
                    this.materials.splice(this.materials.indexOf(material), 1);
                    this.materialsChanged = true;
                })
                .catch(err => toast.error(err));
        };

        ok = () => this.close();
    },
};

ng.module('app.exam.editor').component('examMaterial', ExamMaterialComponent);
