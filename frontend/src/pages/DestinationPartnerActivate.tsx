// @ts-nocheck
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Eye, EyeSlash, Key, LockKey } from '@phosphor-icons/react';
import { Button, IconButton, SurfaceCard, TextField } from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';
import { destinationPartnerPortalService } from '../services/destinationPartnerPortalService';
import { inputAssistProps } from '../utils/inputAssist';

export function DestinationPartnerActivate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get('token') || '').trim(), [params]);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: any) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Convite não encontrado. Abra o link recebido por e-mail.');
      return;
    }
    if (form.password.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setLoading(true);
    try {
      await destinationPartnerPortalService.activate(token, form.password);
      navigate('/parceiro', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível ativar seu acesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showHeader title="Ativar parceiro" eyebrow="Já no Caminho" subtitle="Crie sua senha de acesso" backTo="/entrar">
      <form onSubmit={submit} className="jnc-ds-surface w-full max-w-[520px] rounded-[2rem] p-5 sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#153A4C] text-white shadow-[0_16px_34px_-22px_rgba(21,58,76,0.7)]">
            <Key size={22} weight="duotone" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]/75">Portal de destinos</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Defina sua senha</h1>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Depois disso você já consegue atualizar fotos, contatos e informações do seu cadastro.</p>
          </div>
        </div>

        <div className="space-y-3">
          {['password', 'confirmPassword'].map((field, index) => (
            <TextField
              key={field}
              {...inputAssistProps.newPassword}
              name={field}
              label={index === 0 ? 'Nova senha' : 'Confirmar senha'}
              type={showPassword ? 'text' : 'password'}
              value={form[field]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
              placeholder={index === 0 ? 'Crie uma senha segura' : 'Digite a senha novamente'}
              inputClassName="bg-slate-50 focus:bg-white"
              rightIcon={index === 0 ? (
                <IconButton
                  type="button"
                  variant="plain"
                  size="sm"
                  onClick={() => setShowPassword((prev) => !prev)}
                  icon={showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="-mr-2"
                />
              ) : undefined}
            />
          ))}
        </div>

        {error ? (
          <SurfaceCard padding="md" className="mt-4 rounded-2xl border-rose-100 bg-rose-50 text-sm font-bold text-rose-700 shadow-none">
            {error}
          </SurfaceCard>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          leftIcon={loading ? <LockKey size={19} weight="duotone" /> : <CheckCircle size={20} weight="duotone" />}
          className="mt-5"
        >
          Ativar meu acesso
        </Button>
      </form>
    </AuthLayout>
  );
}
