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
import * as toast from 'toastr';

@Component({
    template: require('./accessibility.component.html'),
    selector: 'accessibility',
})
export class AccessibilityComponent implements OnInit {
    newItem: { name: string };
    accessibilities: any[];
    showName = false;

    constructor(private translate: TranslateService, private http: HttpClient) {}

    ngOnInit() {
        this.newItem = { name: '' };
        this.http.get<any[]>('/app/accessibility').subscribe(resp => {
            this.accessibilities = resp;
        });
    }

    initItem = () => {
        this.newItem = { name: '' };
    };

    add = () => {
        this.http.post<any>('/app/accessibility', this.newItem).subscribe(resp => {
            this.accessibilities.push(resp);
            toast.info(this.translate.instant('sitnet_accessibility_added'));
            this.initItem();
        });
    };

    update = (accessibility: any) => {
        this.http.put<void>('/app/accessibility', accessibility).subscribe(() => {
            toast.info(this.translate.instant('sitnet_accessibility_updated'));
        });
    };

    remove = (accessibility: any) => {
        this.http.delete<void>('/app/accessibility/' + accessibility.id).subscribe(() => {
            this.accessibilities.splice(this.accessibilities.indexOf(accessibility), 1);
            toast.info(this.translate.instant('sitnet_accessibility_removed'));
        });
    };
}
