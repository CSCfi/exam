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
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Software } from '../exam/exam.model';

@Component({
    selector: 'software',
    templateUrl: './software.component.html',
})
export class SoftwareComponent implements OnInit {
    software: (Software & { showName: boolean })[] = [];
    newSoftware = { name: '' };

    constructor(private http: HttpClient, private translate: TranslateService, private toast: ToastrService) {}

    ngOnInit() {
        this.http
            .get<Software[]>('/app/softwares')
            .subscribe((resp) => (this.software = resp.map((r) => ({ ...r, showName: false }))));
    }

    updateSoftware = (software: Software) =>
        this.http.put(`/app/softwares/${software.id}/${software.name}`, {}).subscribe({
            next: () => this.toast.info(this.translate.instant('sitnet_software_updated')),
            error: (err) => this.toast.error(err),
        });

    addSoftware = () =>
        this.http.post<Software>(`/app/softwares/${this.newSoftware.name}`, {}).subscribe({
            next: (resp) => {
                this.toast.info(this.translate.instant('sitnet_software_added'));
                this.software.push({ ...resp, showName: false });
                this.newSoftware.name = '';
            },
            error: (err) => this.toast.error(err),
        });

    removeSoftware = (software: Software & { showName: boolean }) =>
        this.http.delete(`/app/softwares/${software.id}`).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('sitnet_software_removed'));
                this.software.splice(this.software.indexOf(software), 1);
            },
            error: (err) => this.toast.error(err),
        });
}
