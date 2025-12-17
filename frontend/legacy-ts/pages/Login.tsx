import React, { useState } from 'react';
import '../styles/global.css';
import { api } from '../services/api';

interface Props {
  onLogged: (payload: any) => void;
}

export function Login({ onLogged }: Props) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const response = await api.login(form);
      onLogged(response);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Acessar painel</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input name="password" type="password" placeholder="Senha" value={form.password} onChange={handleChange} required />
          <button className="button" type="submit">
            Entrar
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
