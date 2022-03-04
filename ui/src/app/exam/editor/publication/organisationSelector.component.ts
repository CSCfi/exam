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
import { Component, Input } from '@angular/core';

import { ExamService } from '../../exam.service';

import type { Exam } from '../../exam.model';

type Organisation = {
    _id: string;
    name: string;
    code: string;
    filtered: boolean;
    homeOrg: string;
};

@Component({
    selector: 'exam-organisation-selector',
    templateUrl: './organisationSelector.component.html',
})
export class OrganisationSelectorComponent {
    @Input() exam!: Exam;

    organisations: Organisation[] = [];
    selectedOrganisations: Organisation[] = [];

    constructor(private http: HttpClient, private Exam: ExamService) {}

    ngOnInit() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            const organisations = resp.filter((org) => !org.homeOrg);
            this.selectedOrganisations = organisations.filter(
                (o) => this.exam.organisations && this.exam.organisations.split(';').includes(o._id),
            );
            const filtered = this.selectedOrganisations.map((o) => o._id);
            this.organisations = organisations.map((o) => ({ ...o, filtered: filtered.includes(o._id) }));
        });
    }

    addOrganisation = (organisation: Organisation) => {
        if (!this.exam.organisations) {
            this.exam.organisations = organisation._id;
        } else if (!this.exam.organisations.includes(organisation._id)) {
            this.exam.organisations = `${this.exam.organisations};${organisation._id}`;
        } else {
            return;
        }
        this.Exam.updateExam$(this.exam, {}, true).subscribe(() => {
            this.selectedOrganisations.push(organisation);
            organisation.filtered = true;
        });
    };

    removeOrganisation = (organisation: Organisation) => {
        if (!this.exam.organisations || !this.exam.organisations.includes(organisation._id)) {
            return;
        } else if (this.exam.organisations.includes(';' + organisation._id)) {
            this.exam.organisations = this.exam.organisations.replace(';' + organisation._id, '');
        } else if (this.exam.organisations.includes(organisation._id)) {
            this.exam.organisations = this.exam.organisations.replace(organisation._id, '');
        } else {
            return;
        }
        this.Exam.updateExam$(this.exam, {}, true).subscribe(() => {
            this.selectedOrganisations.splice(this.selectedOrganisations.indexOf(organisation), 1);
            organisation.filtered = false;
        });
    };
}
