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

type Organisation = {
    _id: string;
    name: string;
    homeOrg: boolean;
    code: string;
};

@Component({
    selector: 'library-transfer',
    templateUrl: './libraryTransfer.component.html',
})
export class LibraryTransferComponent implements OnInit {
    @Input() selections: number[];
    organisations: Organisation[];
    filteredOrganisations: (Organisation & { filtered: boolean })[];
    organisation: Organisation;
    filter: string;
    showOrganisationSelection = false;

    constructor(private http: HttpClient, private translate: TranslateService) {}

    ngOnInit() {
        this.http.get<Organisation[]>('/integration/iop/organisations').subscribe(resp => {
            this.organisations = resp.filter(org => !org.homeOrg);
            this.filterOrganisations();
        });
    }

    filterOrganisations = () =>
        (this.filteredOrganisations = this.organisations
            .filter(o => o.name.startsWith(this.filter))
            .map(o => ({ ...o, filtered: false })));

    transfer = () => {
        if (this.selections.length == 0) {
            toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
        } else {
            this.http
                .post('/integration/iop/export', {
                    type: 'QUESTION',
                    orgRef: this.organisation._id,
                    ids: this.selections,
                })
                .subscribe(
                    () => toast.info(this.translate.instant('sitnet_questions_transferred')),
                    err => toast.error(err.data),
                );
        }
    };
}
