// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

type Personnel = { examInspections: ExamInspection[]; examOwners: User[] };
@Component({
    selector: 'xm-teacher-list',
    template: `
        <span>
            <span class="fw-bold">{{ owners }}</span>
            @if (inspectors) {
                <span>, {{ inspectors }}</span>
            }
        </span>
    `,
    standalone: true,
    imports: [],
})
export class TeacherListComponent implements OnInit {
    @Input() exam!: Personnel & { parent: Personnel | null };
    @Input() useParent = false;

    owners = '';
    inspectors = '';

    ngOnInit() {
        const owners = this.useParent && this.exam.parent ? this.exam.parent.examOwners : this.exam.examOwners;
        const inspectors = this.exam.examInspections ? this.exam.examInspections.map((ei) => ei.user) : [];
        this.inspectors = inspectors
            .filter((i) => i)
            .map((i) => `${i.firstName} ${i.lastName}`)
            .join(', ');
        if (owners.filter((o) => o.lastName).length > 0) {
            this.owners = `${owners.map((o) => `${o.firstName} ${o.lastName}`).join(', ')}`;
        }
    }
}
