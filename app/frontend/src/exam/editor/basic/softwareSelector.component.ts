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
import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { Exam, Software } from '../../exam.model';

@Component({
    selector: 'software-selector',
    template: require('./softwareSelector.component.html'),
})
export class SoftwareSelectorComponent implements OnInit {
    @Input() exam: Exam;

    software: unknown[];

    constructor(private http: HttpClient, private translate: TranslateService) {}

    ngOnInit() {
        this.http.get<unknown[]>('/app/softwares').subscribe(data => (this.software = data));
    }

    selectedSoftware = () =>
        this.exam.softwares.length === 0
            ? this.translate.instant('sitnet_select')
            : this.exam.softwares.map(s => s.name).join(', ');

    isSelected = (sw: Software) => this.exam.softwares.some(es => es.id === sw.id);

    updateExamSoftware = (sw: Software) => {
        this.http.put(`/app/exam/${this.exam.id}/software/${sw.id}`, {}).subscribe(
            () => {
                if (this.isSelected(sw)) {
                    const index = this.exam.softwares.map(es => es.id).indexOf(sw.id);
                    this.exam.softwares.splice(index, 1);
                } else {
                    this.exam.softwares.push(sw);
                }
                toast.info(this.translate.instant('sitnet_exam_software_updated'));
            },
            err => toast.error(err.data),
        );
    };
}
