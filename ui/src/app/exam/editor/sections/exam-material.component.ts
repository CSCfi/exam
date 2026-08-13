// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NgbActiveModal, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamMaterial } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-exam-material',
    templateUrl: './exam-material.component.html',
    imports: [FormField, TranslateModule, NgbPopoverModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamMaterialComponent {
    readonly materials = signal<ExamMaterial[]>([]);
    readonly filter = signal('');
    readonly materialForm = form(signal({ name: '', author: '', isbn: '' }), (path) => {
        required(path.name);
    });
    readonly filteredMaterials = computed(() => {
        const filterValue = this.filter();
        if (!filterValue) {
            return this.materials();
        }
        return this.materials().filter(
            (m) =>
                m.name.startsWith(filterValue) || m.author?.startsWith(filterValue) || m.isbn?.startsWith(filterValue),
        );
    });

    private readonly activeModal = inject(NgbActiveModal);
    private readonly http = inject(HttpClient);
    private readonly toast = inject(ToastrService);

    constructor() {
        this.http.get<ExamMaterial[]>('/app/materials').subscribe({
            next: (resp) => this.materials.set(resp),
            error: (err) => this.toast.error(err),
        });
    }

    onFilterInput = (event: Event) => this.filter.set((event.target as HTMLInputElement).value);

    createMaterial() {
        const { name, author, isbn } = this.materialForm;
        this.http
            .post<ExamMaterial>('/app/materials', {
                name: name().value(),
                author: author().value(),
                isbn: isbn().value(),
            })
            .subscribe({
                next: (resp) => {
                    this.materials.update((materials) => [...materials, resp]);
                    name().value.set('');
                    author().value.set('');
                    isbn().value.set('');
                },
                error: (err) => this.toast.error(err),
            });
    }

    removeMaterial(material: ExamMaterial) {
        this.http.delete(`/app/materials/${material.id}`).subscribe({
            next: () => {
                this.materials.update((materials) => materials.filter((m) => m.id !== material.id));
            },
            error: (err) => this.toast.error(err),
        });
    }

    ok() {
        this.activeModal.close();
    }
}
