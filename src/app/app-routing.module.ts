import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AloneCabinetComponent} from './alone-cabinet/alone-cabinet.component';
import {authGuard, adminGuard} from "./core/auth/auth.guard";

const routes: Routes = [
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)},
  {path: 'register', loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent)},
  {path: 'alone-cabinet', component: AloneCabinetComponent},
  {
    path: 'kitchen',
    loadComponent: () => import('./kitchen/kitchen-page.component').then(m => m.KitchenPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'kitchen/projects',
    loadComponent: () => import('./kitchen/projects-list/kitchen-projects-list.component')
      .then(m => m.KitchenProjectsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [authGuard, adminGuard]
  },
  {path: '**', loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent)},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
