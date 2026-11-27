// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Software } from 'src/app/facility/facility.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-software',
    templateUrl: './software.component.html',
    imports: [FormsModule, FormField, TranslateModule, OrderByPipe],
})
export class SoftwareComponent implements OnInit {
    readonly software = signal<(Software & { showName: boolean })[]>([]);
    readonly newSoftwareForm = form(signal({ name: '' }), (path) => {
        required(path.name);
    });

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    ngOnInit() {
        this.http
            .get<Software[]>('/app/softwares')
            .subscribe((resp) => this.software.set(resp.map((r) => ({ ...r, showName: false }))));
    }

    updateSoftware = (software: Software & { showName: boolean }) => {
        this.http.put(`/app/softwares/${software.id}/${software.name}`, {}).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_software_updated'));
                this.software.update((list) =>
                    list.map((s) => (s.id === software.id ? { ...s, name: software.name, showName: false } : s)),
                );
            },
            error: (err) => this.toast.error(err),
        });
    };

    addSoftware = () =>
        this.http.post<Software>(`/app/softwares/${this.newSoftwareForm.name().value()}`, {}).subscribe({
            next: (resp) => {
                this.toast.info(this.translate.instant('i18n_software_added'));
                this.software.update((list) => [...list, { ...resp, showName: false }]);
                this.newSoftwareForm.name().value.set('');
            },
            error: (err) => this.toast.error(err),
        });

    removeSoftware = (software: Software & { showName: boolean }) =>
        this.http.delete(`/app/softwares/${software.id}`).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_software_removed'));
                this.software.update((list) => list.filter((s) => s.id !== software.id));
            },
            error: (err) => this.toast.error(err),
        });

    toggleShowName = (software: Software & { showName: boolean }) => {
        this.software.update((list) => list.map((s) => (s.id === software.id ? { ...s, showName: !s.showName } : s)));
    };
}
