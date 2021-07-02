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
import { HttpClient } from '@angular/common/http';
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import * as toast from 'toastr';

import type { ExamMaterial } from '../../exam.model';
import { ExamSection } from '../../exam.model';
import { ExamMaterialComponent } from './examMaterial.component';

@Component({
    selector: 'exam-material-selector',
    templateUrl: './examMaterialSelector.component.html',
})
export class ExamMaterialSelectorComponent {
    @Input() section: ExamSection;
    @Input() allMaterials: ExamMaterial[];
    @Output() onChanges = new EventEmitter<void>();
    materials: ExamMaterial[];
    selectedMaterial?: ExamMaterial;
    filter: string;

    constructor(private http: HttpClient, private modal: NgbModal) {}

    private filterOutExisting = () => {
        this.materials = this.allMaterials.filter(
            (m) => this.section.examMaterials.map((em) => em.id).indexOf(m.id) == -1,
        );
    };

    ngOnInit() {
        this.filterOutExisting();
    }

    ngOnChanges = (changes: SimpleChanges) => {
        if (changes.allMaterials) {
            this.filterOutExisting();
        }
    };

    selectMaterial(event: NgbTypeaheadSelectItemEvent) {
        this.selectedMaterial = event.item;
    }

    filterMaterials$ = (text$: Observable<string>): Observable<ExamMaterial[]> => {
        return text$.pipe(
            distinctUntilChanged(),
            map((t) => {
                const re = new RegExp(t, 'i');
                return this.materials.filter((m) => m.name.match(re));
            }),
        );
    };
    nameFormat = (m: ExamMaterial) => m.name;

    addMaterial = () => {
        if (!this.selectedMaterial) return;
        this.http.post(`/app/materials/${this.selectedMaterial.id}/${this.section.id}`, {}).subscribe(
            () => {
                this.section.examMaterials.push(this.selectedMaterial as ExamMaterial);
                delete this.selectedMaterial;
                this.filterOutExisting();
                this.filter = '';
            },
            (err) => toast.error(err),
        );
    };

    removeMaterial = (material: ExamMaterial) => {
        this.http.delete(`/app/materials/${material.id}/${this.section.id}`).subscribe(
            () => {
                this.section.examMaterials.splice(this.section.examMaterials.indexOf(material), 1);
                this.filterOutExisting();
            },
            (err) => toast.error(err),
        );
    };

    openMaterialEditor = () => {
        this.modal
            .open(ExamMaterialComponent, {
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
            })
            .result.then(() =>
                // this.filterOutExisting();
                this.onChanges.emit(),
            );
    };
}
