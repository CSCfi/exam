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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { Software } from '../exam/exam.model';

@Component({
    selector: 'software',
    templateUrl: './software.component.html',
})
export class SoftwareComponent {
    software: Software[] = [];
    newSoftware = { name: '' };
    showName = false;

    constructor(private http: HttpClient, private translate: TranslateService) {}

    ngOnInit() {
        this.http.get<Software[]>('/app/softwares').subscribe(resp => (this.software = resp));
    }

    updateSoftware = (software: Software) =>
        this.http.put(`/app/softares/${software.id}/${software.name}`, {}).subscribe(
            () => toast.info(this.translate.instant('sitnet_software_updated')),
            err => toast.error(err),
        );

    addSoftware = () =>
        this.http.post<Software>(`/app/softwares/add/${this.newSoftware.name}`, {}).subscribe(
            resp => {
                toast.info(this.translate.instant('sitnet_software_added'));
                this.software.push(resp);
                this.newSoftware.name = '';
            },
            err => toast.error(err),
        );

    removeSoftware = (software: Software) =>
        this.http.delete(`/app/softwares/${software.id}`).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_software_removed'));
                this.software.splice(this.software.indexOf(software), 1);
            },
            err => toast.error(err),
        );
}
