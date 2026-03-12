// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { NgbHighlight, NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, tap } from 'rxjs/operators';
import type { Course } from 'src/app/exam/exam.model';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { CoursePickerService } from './course-picker.service';

@Component({
    selector: 'xm-course-picker',
    templateUrl: './course-picker.component.html',
    styleUrls: ['../../exam.shared.scss'],
    imports: [FormField, NgbTypeahead, NgbHighlight, NgbPopover, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePickerComponent {
    readonly course = input<Course | undefined>();
    readonly updated = output<Course>();

    readonly courseFilterModel = signal({ name: '', code: '' });
    readonly loaderName = signal(false);
    readonly loaderCode = signal(false);
    readonly courseFilterForm = form(this.courseFilterModel);

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Course = inject(CoursePickerService);
    private readonly CourseCode = inject(CourseCodeService);

    constructor() {
        effect(() => {
            const currentCourse = this.course();
            if (currentCourse) {
                this.courseFilterModel.set({
                    name: currentCourse.name,
                    code: this.CourseCode.formatCode(currentCourse.code),
                });
            } else {
                this.courseFilterModel.set({ name: '', code: '' });
            }
        });
    }

    getCoursesByCode$ = (text$: Observable<string>) => this.getCourses$('code', text$);
    getCoursesByName$ = (text$: Observable<string>) => this.getCourses$('name', text$);

    codeFormat = (c: Course | string) => (this.isCourse(c) ? c.code : c);
    nameFormat = (c: Course | string) => (this.isCourse(c) ? c.name : c);

    onCourseSelect(event: NgbTypeaheadSelectItemEvent) {
        this.courseFilterForm.code().value.set(this.CourseCode.formatCode(event.item.code));
        this.courseFilterForm.name().value.set(event.item.name);
        this.updated.emit(event.item);
    }

    private showError(term: string) {
        this.toast.error(`${this.translate.instant('i18n_course_not_found')} ( ${term}  )`);
    }

    private getCourses$(category: 'name' | 'code', text$: Observable<string>): Observable<Course[]> {
        return text$.pipe(
            tap((term) => {
                this.setInputValue(category, term);
                this.toggleLoadingIcon(category, term.length >= 2);
            }),
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) => (term.trim().length < 2 ? from([]) : this.Course.getCourses$(category, term))),
            tap((courses) => {
                this.toggleLoadingIcon(category, false);
                if (courses.length === 0) {
                    const searchTerm =
                        category === 'code'
                            ? this.courseFilterForm.code().value()
                            : this.courseFilterForm.name().value();
                    this.showError(searchTerm);
                }
            }),
        );
    }

    private isCourse(input: string | Course): input is Course {
        return (input as Course).code !== undefined;
    }

    private toggleLoadingIcon(filter: 'name' | 'code', isOn: boolean) {
        if (filter === 'name') {
            this.loaderName.set(isOn);
        } else {
            this.loaderCode.set(isOn);
        }
    }

    private setInputValue(filter: string, value: string) {
        if (filter === 'code') {
            this.courseFilterForm.code().value.set(value);
            this.courseFilterForm.name().value.set('');
        } else if (filter === 'name') {
            this.courseFilterForm.name().value.set(value);
            this.courseFilterForm.code().value.set('');
        }
    }
}
