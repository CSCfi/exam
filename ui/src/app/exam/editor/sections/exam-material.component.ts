// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamMaterial } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-exam-material',
    templateUrl: './exam-material.component.html',
    standalone: true,
    imports: [FormsModule, TranslateModule, NgbPopoverModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamMaterialComponent {
    materials = signal<ExamMaterial[]>([]);
    filter = signal('');
    newMaterial: Partial<ExamMaterial> = {};
    materialsChanged = signal(false);

    filteredMaterials = computed(() => {
        const filterValue = this.filter();
        if (!filterValue) {
            return this.materials();
        }
        return this.materials().filter(
            (m) =>
                m.name.startsWith(filterValue) || m.author?.startsWith(filterValue) || m.isbn?.startsWith(filterValue),
        );
    });

    private activeModal = inject(NgbActiveModal);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);

    constructor() {
        this.http.get<ExamMaterial[]>('/app/materials').subscribe({
            next: (resp) => this.materials.set(resp),
            error: (err) => this.toast.error(err),
        });
    }

    createMaterial() {
        this.http.post<ExamMaterial>('/app/materials', this.newMaterial).subscribe({
            next: (resp) => {
                this.materials.update((materials) => [...materials, resp]);
                this.newMaterial = {};
                this.materialsChanged.set(true);
            },
            error: (err) => this.toast.error(err),
        });
    }

    removeMaterial(material: ExamMaterial) {
        this.http.delete(`/app/materials/${material.id}`).subscribe({
            next: () => {
                this.materials.update((materials) => materials.filter((m) => m.id !== material.id));
                this.materialsChanged.set(true);
            },
            error: (err) => this.toast.error(err),
        });
    }

    ok() {
        this.activeModal.close();
    }
}
