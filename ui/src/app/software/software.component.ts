// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Software } from 'src/app/exam/exam.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-software',
    templateUrl: './software.component.html',
    standalone: true,
    imports: [FormsModule, TranslateModule, OrderByPipe],
})
export class SoftwareComponent implements OnInit {
    software: (Software & { showName: boolean })[] = [];
    newSoftware = { name: '' };

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.http
            .get<Software[]>('/app/softwares')
            .subscribe((resp) => (this.software = resp.map((r) => ({ ...r, showName: false }))));
    }

    updateSoftware = (software: Software) =>
        this.http.put(`/app/softwares/${software.id}/${software.name}`, {}).subscribe({
            next: () => this.toast.info(this.translate.instant('i18n_software_updated')),
            error: (err) => this.toast.error(err),
        });

    addSoftware = () =>
        this.http.post<Software>(`/app/softwares/${this.newSoftware.name}`, {}).subscribe({
            next: (resp) => {
                this.toast.info(this.translate.instant('i18n_software_added'));
                this.software.push({ ...resp, showName: false });
                this.newSoftware.name = '';
            },
            error: (err) => this.toast.error(err),
        });

    removeSoftware = (software: Software & { showName: boolean }) =>
        this.http.delete(`/app/softwares/${software.id}`).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_software_removed'));
                this.software.splice(this.software.indexOf(software), 1);
            },
            error: (err) => this.toast.error(err),
        });
}
