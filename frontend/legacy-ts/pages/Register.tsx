import React, { useState } from 'react';
import '../styles/global.css';
import { api } from '../services/api';

interface Props {
  onRegistered: (payload: any) => void;
}

const defaultColors = { primaryColor: '#b91c1c', secondaryColor: '#111827' };

export function Register({ onRegistered }: Props) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    storeName: '',
    logoUrl: '',
    ...defaultColors,
  });
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const response = await api.registerOwner(form);
      onRegistered(response);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Cadastre sua loja</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input name="fullName" placeholder="Nome completo" value={form.fullName} onChange={handleChange} required />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input name="password" type="password" placeholder="Senha" value={form.password} onChange={handleChange} required />
          <input name="phone" placeholder="Telefone" value={form.phone} onChange={handleChange} required />
          <input name="address" placeholder="Endereço completo" value={form.address} onChange={handleChange} required />
          <input name="storeName" placeholder="Nome da loja" value={form.storeName} onChange={handleChange} required />
          <input name="logoUrl" placeholder="URL do logo" value={form.logoUrl} onChange={handleChange} />
          <label>
            Cor primária
            <input name="primaryColor" type="color" value={form.primaryColor} onChange={handleChange} />
          </label>
          <label>
            Cor secundária
            <input name="secondaryColor" type="color" value={form.secondaryColor} onChange={handleChange} />
          </label>
          <button className="button" type="submit">
            Criar loja
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
