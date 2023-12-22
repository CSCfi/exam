import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../../shared/shared.module';
import { MachineComponent } from './machine.component';
import { MachineListComponent } from './machines.component';
import { MachineService } from './machines.service';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        NgbModule,
        SharedModule,
        MachineListComponent,
        MachineComponent,
    ],
    providers: [MachineService],
    exports: [MachineListComponent],
})
export class MachineModule {}
