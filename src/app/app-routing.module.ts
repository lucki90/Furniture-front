import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AloneCabinetComponent} from './alone-cabinet/alone-cabinet.component';
import {SecretLockerComponent} from './secret-locker/secret-locker.component';

const routes: Routes = [
  {path: '', redirectTo: '/alone-cabinet', pathMatch: 'full'},
  {path: 'alone-cabinet', component: AloneCabinetComponent},
  {path: 'secret-locker', component: SecretLockerComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
