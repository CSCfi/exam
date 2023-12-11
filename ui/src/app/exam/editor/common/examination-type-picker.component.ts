import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbAccordionDirective, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ExamService } from '../../exam.service';

export type ExamConfig = { type: string; name: string; examinationTypes: { type: string; name: string }[] };

@Component({
    selector: 'xm-examination-type-selector',
    template: `
        <div id="sitnet-dialog" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h4 class="modal-title"><i class="bi-person"></i>&nbsp;&nbsp;{{ 'sitnet_choose' | translate }}</h4>
            </div>
            <div class="modal-body">
                <div ngbAccordion #acc="ngbAccordion">
                    <div ngbAccordionItem="executionType">
                        <h2 ngbAccordionHeader>
                            <button ngbAccordionButton>
                                {{ 'sitnet_choose_execution_type' | translate }}
                            </button>
                        </h2>
                        <div ngbAccordionCollapse>
                            <div ngbAccordionBody>
                                <ng-template>
                                    <div *ngFor="let type of executionTypes">
                                        <a
                                            class="pointer"
                                            [ngClass]="{ 'selected-type': selectedType === type }"
                                            *ngIf="type.examinationTypes.length > 0"
                                            (click)="selectType(type)"
                                            autofocus
                                        >
                                            {{ type.name | translate }}
                                        </a>
                                        <a
                                            class="pointer"
                                            *ngIf="type.examinationTypes.length === 0"
                                            (click)="selectConfig(type.type)"
                                        >
                                            {{ type.name | translate }}
                                        </a>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </div>
                    <div
                        ngbAccordionItem="examinationType"
                        [disabled]="!selectedType || selectedType.examinationTypes.length === 0"
                    >
                        <h2 ngbAccordionHeader>
                            <button ngbAccordionButton>
                                {{ 'sitnet_examination_type' | translate }}
                            </button>
                        </h2>
                        <div ngbAccordionCollapse>
                            <div ngbAccordionBody>
                                <ng-template>
                                    <div *ngFor="let et of selectedType.examinationTypes">
                                        <a class="pointer" (click)="selectConfig(selectedType.type, et.type)">
                                            {{ et.name | translate }}
                                        </a>
                                    </div>
                                </ng-template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm btn-danger" (click)="cancel()">
                    {{ 'sitnet_button_cancel' | translate }}
                </button>
            </div>
        </div>
    `,
    styles: [
        `
            .selected-type {
                color: black;
                font-weight: bold;
                text-decoration: none;
            }
        `,
    ],
})
export class ExaminationTypeSelectorComponent implements OnInit {
    @ViewChild('acc', { static: false }) acc!: NgbAccordionDirective;
    executionTypes: ExamConfig[] = [];
    selectedType!: ExamConfig;

    constructor(private http: HttpClient, private modal: NgbActiveModal, private Exam: ExamService) {}

    ngOnInit() {
        this.http
            .get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod')
            .subscribe((resp) => {
                this.Exam.listExecutionTypes$().subscribe((types) => {
                    this.executionTypes = types.map((t) => {
                        const implementations = [];
                        if (t.type !== 'PRINTOUT' && (resp.sebExaminationSupported || resp.homeExaminationSupported)) {
                            implementations.push({ type: 'AQUARIUM', name: 'sitnet_examination_type_aquarium' });
                            if (resp.sebExaminationSupported) {
                                implementations.push({ type: 'CLIENT_AUTH', name: 'sitnet_examination_type_seb' });
                            }
                            if (resp.homeExaminationSupported) {
                                implementations.push({ type: 'WHATEVER', name: 'sitnet_examination_type_home_exam' });
                            }
                        }
                        return { ...t, examinationTypes: implementations };
                    });
                });
                this.acc.expand('executionType');
            });
    }

    selectType = (type: ExamConfig) => {
        this.selectedType = type;
        setTimeout(() => this.acc.expand('examinationType'), 100);
    };

    selectConfig = (type: string, examinationType = 'AQUARIUM') =>
        this.modal.close({ type: type, examinationType: examinationType });

    cancel = () => this.modal.dismiss();
}
