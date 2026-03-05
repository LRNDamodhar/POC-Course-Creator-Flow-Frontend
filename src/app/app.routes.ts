import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { ChatPageComponent } from './components/chat-page/chat-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' }
];
