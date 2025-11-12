// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { ExamMaterial, ExamSection } from 'src/app/exam/exam.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { ExamMaterialComponent } from './exam-material.component';

@Component({
    selector: 'xm-exam-material-selector',
    templateUrl: './exam-material-picker.component.html',
    standalone: true,
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamMaterialSelectorComponent {
    section = input.required<ExamSection>();
    allMaterials = input<ExamMaterial[]>([]);
    changed = output<void>();

    materials = computed(() =>
        this.allMaterials().filter(
            (m) =>
                this.section()
                    .examMaterials.map((em) => em.id)
                    .indexOf(m.id) == -1,
        ),
    );
    selectedMaterial = signal<ExamMaterial | undefined>(undefined);
    filter = signal('');

    private http = inject(HttpClient);
    private modal = inject(ModalService);
    private toast = inject(ToastrService);

    selectMaterial(event: NgbTypeaheadSelectItemEvent) {
        this.selectedMaterial.set(event.item);
    }

    filterMaterials$(text$: Observable<string>): Observable<ExamMaterial[]> {
        return text$.pipe(
            distinctUntilChanged(),
            map((t) => {
                const re = new RegExp(t, 'i');
                return this.materials().filter((m) => m.name.match(re));
            }),
        );
    }

    nameFormat(m: ExamMaterial) {
        return m.name;
    }

    addMaterial() {
        const material = this.selectedMaterial();
        if (!material) return;
        const currentSection = this.section();
        this.http.post(`/app/materials/${material.id}/${currentSection.id}`, {}).subscribe({
            next: () => {
                currentSection.examMaterials.push(material);
                this.selectedMaterial.set(undefined);
                this.filter.set('');
            },
            error: (err) => this.toast.error(err),
        });
    }

    removeMaterial(material: ExamMaterial) {
        const currentSection = this.section();
        this.http.delete(`/app/materials/${material.id}/${currentSection.id}`).subscribe({
            next: () => {
                currentSection.examMaterials.splice(currentSection.examMaterials.indexOf(material), 1);
            },
            error: (err) => this.toast.error(err),
        });
    }

    openMaterialEditor() {
        this.modal
            .open$(ExamMaterialComponent, { windowClass: 'question-editor-modal' })
            .subscribe(() => this.changed.emit());
    }
}
