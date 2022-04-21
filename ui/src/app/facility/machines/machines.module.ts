import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { UIRouterModule } from '@uirouter/angular';
import { SharedModule } from '../../shared/shared.module';
import { MachineComponent } from './machine.component';
import { MachineListComponent } from './machines.component';
import { MachineService } from './machines.service';

@NgModule({
    imports: [CommonModule, TranslateModule, NgbModule, SharedModule, UIRouterModule],
    providers: [MachineService],
    declarations: [MachineListComponent, MachineComponent],
    exports: [MachineListComponent],
})
export class MachineModule {}
