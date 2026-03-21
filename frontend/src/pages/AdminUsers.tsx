// @ts-nocheck
import React from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { StoreUsersPanel } from '../components/Admin/StoreUsersPanel';

export function AdminUsers() {
  return (
    <AdminLayout contextLabel="Usuários">
      <div className="mx-auto w-full max-w-5xl">
        <StoreUsersPanel />
      </div>
    </AdminLayout>
  );
}
