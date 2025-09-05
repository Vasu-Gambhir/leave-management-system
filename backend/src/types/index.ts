import { Context } from 'hono';

export interface User {
  id: string;
  email: string;
  name: string;
  organization_id: string;
  role: 'admin' | 'team_member' | 'approval_manager';
}

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
  }
}

export type AuthContext = Context & {
  get(key: 'user'): User;
  set(key: 'user', value: User): void;
};