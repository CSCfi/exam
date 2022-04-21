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
import type { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { User } from '../../../session/session.service';
import type { Exam } from '../../exam.model';

@Component({
    selector: 'exam-owner-selector',
    templateUrl: './exam-owner-selector.component.html',
})
export class ExamOwnerSelectorComponent implements OnInit {
    @Input() exam!: Exam;

    examOwners: User[] = [];

    newOwner: {
        id?: number;
        name?: string;
        email?: string;
    };

    constructor(private http: HttpClient, private translate: TranslateService, private toast: ToastrService) {
        this.newOwner = {};
    }

    ngOnInit() {
        this.http.get<User[]>(`/app/exam/${this.exam.id}/owners`).subscribe((users) => (this.examOwners = users));
    }

    listOwners$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap((text) => (this.newOwner.name = text)),
            debounceTime(500),
            distinctUntilChanged(),
            exhaustMap((text) =>
                text.length < 2
                    ? of([])
                    : this.http.get<User[]>(`/app/users/filter/TEACHER/${this.exam.id}`, { params: { q: text } }),
            ),
            take(15),
            catchError((err) => {
                this.toast.error(err);
                return throwError(() => new Error(err));
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name} ${data.email}`;

    setExamOwner = (event: NgbTypeaheadSelectItemEvent) => (this.newOwner.id = event.item.id);

    addExamOwner = () => {
        if (this.newOwner.id) {
            this.http.post(`/app/exam/${this.exam.id}/owner/${this.newOwner.id}`, {}).subscribe({
                next: () => {
                    this.getExamOwners();
                    // clear input field
                    delete this.newOwner.email;
                    delete this.newOwner.name;
                    delete this.newOwner.id;
                },
                error: (err) => this.toast.error,
            });
        } else {
            this.toast.error(this.translate.instant('sitnet_teacher_not_found'));
        }
    };

    removeOwner = (id: number) =>
        this.http
            .delete(`/app/exam/${this.exam.id}/owner/${id}`)
            .subscribe({ next: this.getExamOwners, error: this.toast.error });

    private getExamOwners = () =>
        this.http
            .get<User[]>(`/app/exam/${this.exam.id}/owners`)
            .subscribe({ next: (owners) => (this.examOwners = owners), error: this.toast.error });
}
