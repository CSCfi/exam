// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { Exam, ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { ExamInspectorService } from './exam-inspector.service';

@Component({
    selector: 'xm-exam-inspector-picker',
    templateUrl: './exam-inspector-picker.component.html',
    standalone: true,
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule, NgClass],
    styles: '.vbottom { vertical-align: bottom !important }',
    styleUrls: ['../../exam.shared.scss'],
})
export class ExamInspectorSelectorComponent implements OnInit {
    @Input() exam!: Exam;
    examInspections: ExamInspection[] = [];
    newInspector: {
        id?: number;
        sendMessage?: boolean;
        comment?: string;
        name?: string;
        email?: string;
    };

    constructor(
        private toast: ToastrService,
        private inspectorService: ExamInspectorService,
    ) {
        this.newInspector = {};
    }

    ngOnInit() {
        this.getInspectors();
    }

    listInspectors$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap((text) => (this.newInspector.name = text)),
            debounceTime(500),
            distinctUntilChanged(),
            exhaustMap((text) =>
                text.length < 2 ? of([]) : this.inspectorService.searchTeachers$(this.exam.id, text),
            ),
            take(15),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name} ${data.email}`;

    setInspector = (event: NgbTypeaheadSelectItemEvent) => (this.newInspector.id = event.item.id);

    addInspector = () => {
        if (this.newInspector.id) {
            this.inspectorService
                .addInspector$(this.exam.id, this.newInspector.id, this.newInspector.comment)
                .subscribe({
                    next: () => {
                        this.getInspectors();
                        this.newInspector = {};
                    },
                });
        }
    };

    removeInspector = (id: number) =>
        this.inspectorService.removeInspector$(id).subscribe({
            next: this.getInspectors,
            error: (err) => this.toast.error(err),
        });

    private getInspectors = () =>
        this.inspectorService.getInspections$(this.exam.id).subscribe({
            next: (inspections) => (this.examInspections = inspections),
            error: (err) => this.toast.error(err),
        });
}
