import { describe, expect, it } from 'vitest';
import { api, registerCustomer, verifyEmailDirectly } from '../helpers';

const addressPayload = (label: string, number: string, isDefault?: boolean) => ({
  label,
  recipientName: 'Cliente Endereco',
  phone: '11999990001',
  cep: '01001000',
  street: `Rua ${label}`,
  number,
  neighborhood: 'Centro',
  city: 'Sao Paulo',
  state: 'SP',
  lat: -23.55052,
  lng: -46.633308,
  ...(isDefault === undefined ? {} : { isDefault }),
});

describe('Cliente — Enderecos salvos', () => {
  it('mantem um unico endereco principal e promove outro ao excluir o principal', async () => {
    const customer = await registerCustomer({
      name: 'Cliente Endereco',
      fullName: 'Cliente Endereco',
      phone: '11999990001',
      termsAccepted: true,
      lgpdAccepted: true,
    });
    expect(customer.res.status).toBe(201);
    await verifyEmailDirectly(customer.email);

    const login = await api.post('/api/customer/auth/login').send({
      email: customer.email,
      password: customer.password,
    });
    expect(login.status).toBe(200);
    const token = String(login.body?.token || '');
    expect(token).toBeTruthy();

    const casa = await api
      .post('/api/customer/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send(addressPayload('Casa', '100', false));
    expect(casa.status).toBe(201);
    expect(casa.body?.isDefault).toBe(true);

    const trabalho = await api
      .post('/api/customer/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send(addressPayload('Trabalho', '200', true));
    expect(trabalho.status).toBe(201);
    expect(trabalho.body?.isDefault).toBe(true);

    let list = await api.get('/api/customer/addresses').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.filter((item: any) => item.isDefault)).toHaveLength(1);
    expect(String(list.body.find((item: any) => item.isDefault)?.id || '')).toBe(String(trabalho.body?.id || ''));

    const setCasaDefault = await api
      .patch(`/api/customer/addresses/${casa.body.id}/default`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(setCasaDefault.status).toBe(200);
    expect(setCasaDefault.body?.isDefault).toBe(true);

    list = await api.get('/api/customer/addresses').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.filter((item: any) => item.isDefault)).toHaveLength(1);
    expect(String(list.body.find((item: any) => item.isDefault)?.id || '')).toBe(String(casa.body?.id || ''));

    const deleteCasa = await api
      .delete(`/api/customer/addresses/${casa.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteCasa.status).toBe(200);
    expect(deleteCasa.body?.ok).toBe(true);

    list = await api.get('/api/customer/addresses').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(String(list.body[0]?.id || '')).toBe(String(trabalho.body?.id || ''));
    expect(list.body[0]?.isDefault).toBe(true);
  });
});
