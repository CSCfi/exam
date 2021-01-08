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
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import * as toast from 'toastr';

import { ExamMaterial } from '../../exam.model';

@Component({
    selector: 'exam-material',
    template: require('./examMaterial.component.html'),
})
export class ExamMaterialComponent {
    constructor(private activeModal: NgbActiveModal, private http: HttpClient) {}

    materials: ExamMaterial[] = [];
    filteredMaterials: ExamMaterial[] = [];
    newMaterial?: ExamMaterial;
    filter: string;
    materialsChanged: boolean;

    ngOnInit() {
        this.http
            .get<ExamMaterial[]>('/app/materials')
            .subscribe(resp => (this.materials = this.filteredMaterials = resp));
    }

    filterMaterials = () =>
        (this.filteredMaterials = this.materials.filter(
            m => m.name.startsWith(this.filter) || m.author?.startsWith(this.filter) || m.isbn?.startsWith(this.filter),
        ));

    createMaterial = () => {
        this.http.post<ExamMaterial>('/app/materials', this.newMaterial).subscribe(
            resp => {
                this.materials.push(resp);
                this.filterMaterials();
                delete this.newMaterial;
                this.materialsChanged = true;
            },
            err => toast.error(err),
        );
    };

    removeMaterial = (material: ExamMaterial) => {
        this.http.delete(`/app/materials/${material.id}`).subscribe(
            () => {
                this.materials.splice(this.materials.indexOf(material), 1);
                this.filterMaterials();
                this.materialsChanged = true;
            },
            err => toast.error(err),
        );
    };

    ok = () => this.activeModal.close();
}
