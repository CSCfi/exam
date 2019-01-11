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
import { ExamSection, ExamMaterial } from '../../exam.model';
import { IModalService } from 'angular-ui-bootstrap';

export const ExamMaterialSelectorComponent: angular.IComponentOptions = {
    template: require('./examMaterialSelector.template.html'),
    bindings: {
        section: '<',
        allMaterials: '<',
        onChanges: '&'
    },
    controller: class ExamMaterialSelectorController implements angular.IComponentController {
        section: ExamSection;
        materials: ExamMaterial[];
        allMaterials: ExamMaterial[];
        selectedMaterial: ExamMaterial;
        filter: string;
        onChanges: () => any;

        constructor(private $http: angular.IHttpService, private $uibModal: IModalService) {
            'ngInject';
        }

        private filterOutExisting = () => {
            this.materials = this.allMaterials.filter(
                m => this.section.examMaterials.map(em => em.id).indexOf(m.id) == -1);
        }

        $onInit() {
            this.filterOutExisting();
        }

        $onChanges = (changes: angular.IOnChangesObject) => {
            if (changes.allMaterials) {
                this.filterOutExisting();
            }
        }

        selectMaterial(material: ExamMaterial) {
            this.selectedMaterial = material;
        }

        filterMaterials = () => {
            const re = new RegExp(this.filter, 'i');
            return this.materials.filter(m => m.name.match(re));
        }

        addMaterial = () => {
            this.$http.post(`/app/materials/${this.selectedMaterial.id}/${this.section.id}`, {}).then(() => {
                this.section.examMaterials.push(angular.copy(this.selectedMaterial));
                delete this.selectedMaterial;
                this.filterOutExisting();
                delete this.filter;
            }).catch(err => toast.error(err));
        }

        removeMaterial = (material: ExamMaterial) => {
            this.$http.delete(`/app/materials/${material.id}/${this.section.id}`).then(() => {
                this.section.examMaterials.splice(this.section.examMaterials.indexOf(material), 1);
                if (this.section.examMaterials.length === 0) {
                    this.section.optional = false;
                }
                this.filterOutExisting();
            }).catch(err => toast.error(err));
        }

        openMaterialEditor = () => {
            this.$uibModal.open({
                component: 'examMaterial',
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal'
            }).result.then(() => {
                // this.filterOutExisting();
                this.onChanges();
            });
        }

    }
};

angular.module('app.exam.editor').component('examMaterialSelector', ExamMaterialSelectorComponent);
