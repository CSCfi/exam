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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

type Organisation = {
    _id: string;
    name: string;
    homeOrg: boolean;
    code: string;
};

@Component({
    selector: 'xm-library-transfer',
    templateUrl: './library-transfer.component.html',
})
export class LibraryTransferComponent implements OnInit {
    @Input() selections: number[] = [];
    organisations: Organisation[] = [];
    organisation?: Organisation;
    showOrganisationSelection = false;

    constructor(private http: HttpClient, private translate: TranslateService, private toast: ToastrService) {}

    ngOnInit() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            this.organisations = resp.filter((org) => !org.homeOrg);
        });
    }

    transfer = () => {
        if (this.selections.length == 0) {
            this.toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
        } else {
            this.http
                .post('/app/iop/export', {
                    type: 'QUESTION',
                    orgRef: this.organisation?._id,
                    ids: this.selections,
                })
                .subscribe({
                    next: () => this.toast.info(this.translate.instant('sitnet_questions_transferred')),
                    error: (err) => this.toast.error(err),
                });
        }
    };
}
