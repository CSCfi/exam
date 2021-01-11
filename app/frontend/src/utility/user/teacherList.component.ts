/*
 * Copyright (c) 2018 Exam Consortium
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
import { Component, Input, OnInit } from '@angular/core';

import { Exam } from '../../exam/exam.model';

@Component({
    selector: 'teacher-list',
    template: `
        <div>
            <strong>{{ owners }}</strong>
        </div>
        <div>{{ inspectors }}</div>
    `,
})
export class TeacherListComponent implements OnInit {
    @Input() exam: Exam;
    @Input() useParent = false;

    owners: string;
    inspectors: string;

    ngOnInit() {
        const owners = this.useParent && this.exam.parent ? this.exam.parent.examOwners : this.exam.examOwners;
        const inspectors = this.exam.examInspections ? this.exam.examInspections.map(ei => ei.user) : [];
        const inspectorHtml = inspectors
            .filter(i => i)
            .map(i => `${i.firstName} ${i.lastName}`)
            .join(', ');
        if (owners.filter(o => o.lastName).length > 0) {
            const ownerHtml = `${owners.map(o => `${o.firstName} ${o.lastName}`).join(', ')}`;
            return inspectors.length > 0 ? `${ownerHtml}, ${inspectorHtml}` : ownerHtml;
        } else if (inspectors.length > 0) {
            return inspectorHtml;
        } else {
            return '';
        }
    }
}
