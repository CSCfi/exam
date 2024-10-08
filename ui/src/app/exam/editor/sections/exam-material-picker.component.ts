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
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { ExamMaterial, ExamSection } from 'src/app/exam/exam.model';
import { ExamMaterialComponent } from './exam-material.component';

@Component({
    selector: 'xm-exam-material-selector',
    templateUrl: './exam-material-picker.component.html',
    standalone: true,
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
})
export class ExamMaterialSelectorComponent implements OnInit, OnChanges {
    @Input() section!: ExamSection;
    @Input() allMaterials: ExamMaterial[] = [];
    @Output() changed = new EventEmitter<void>();

    materials: ExamMaterial[] = [];
    selectedMaterial?: ExamMaterial;
    filter = '';

    constructor(
        private http: HttpClient,
        private modal: NgbModal,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.filterOutExisting();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.allMaterials) {
            this.filterOutExisting();
        }
    }

    selectMaterial = (event: NgbTypeaheadSelectItemEvent) => (this.selectedMaterial = event.item);

    filterMaterials$ = (text$: Observable<string>): Observable<ExamMaterial[]> =>
        text$.pipe(
            distinctUntilChanged(),
            map((t) => {
                const re = new RegExp(t, 'i');
                return this.materials.filter((m) => m.name.match(re));
            }),
        );

    nameFormat = (m: ExamMaterial) => m.name;

    addMaterial = () => {
        if (!this.selectedMaterial) return;
        this.http.post(`/app/materials/${this.selectedMaterial.id}/${this.section.id}`, {}).subscribe({
            next: () => {
                this.section.examMaterials.push(this.selectedMaterial as ExamMaterial);
                delete this.selectedMaterial;
                this.filterOutExisting();
                this.filter = '';
            },
            error: (err) => this.toast.error(err),
        });
    };

    removeMaterial = (material: ExamMaterial) =>
        this.http.delete(`/app/materials/${material.id}/${this.section.id}`).subscribe({
            next: () => {
                this.section.examMaterials.splice(this.section.examMaterials.indexOf(material), 1);
                this.filterOutExisting();
            },
            error: (err) => this.toast.error(err),
        });

    openMaterialEditor = () =>
        this.modal
            .open(ExamMaterialComponent, {
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
            })
            .result.then(() =>
                // this.filterOutExisting();
                this.changed.emit(),
            );

    private filterOutExisting = () =>
        (this.materials = this.allMaterials.filter(
            (m) => this.section.examMaterials.map((em) => em.id).indexOf(m.id) == -1,
        ));
}
