import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { formatPhoneInput } from '../utils/format';

const BRAZIL_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
];

const onlyDigits = (value = '') => String(value || '').replace(/\D/g, '');
const extractPhoneParts = (value = '') => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  const hasPrefix = /^\(\d{2}\)/.test(raw);
  const ddd = hasPrefix ? digits.slice(0, 2) : '';
  const hasValidDdd = BRAZIL_DDDS.includes(ddd);
  return {
    ddd: hasValidDdd ? ddd : '',
    localNumber: hasValidDdd ? digits.slice(2, 11) : digits.slice(0, 9),
  };
};
const formatLocalPhoneNumber = (value = '') => {
  const digits = onlyDigits(value).slice(0, 9);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatCpfInput = (value = '') => {
  const digits = onlyDigits(value).slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  if (digits.length <= 3) return p1;
  if (digits.length <= 6) return `${p1}.${p2}`;
  if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
};

  const isValidCPF = (value = '') => {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
  let first = (sum * 10) % 11;
  if (first === 10) first = 0;
  if (first !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
  let second = (sum * 10) % 11;
  if (second === 10) second = 0;
  return second === Number(digits[10]);
};

const hasValidPhone = (value = '') => {
  const digits = onlyDigits(value);
  return digits.length >= 10 && digits.length <= 11;
};

export function MotoboyRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [profilePreview, setProfilePreview] = useState('');
  const phoneParts = extractPhoneParts(form.phone || '');
  const handleDddChange = (ddd: string) => {
    const safeDdd = BRAZIL_DDDS.includes(ddd) ? ddd : '';
    const formatted = phoneParts.localNumber
      ? safeDdd
        ? formatPhoneInput(phoneParts.localNumber, safeDdd)
        : formatPhoneInput(phoneParts.localNumber)
      : safeDdd
      ? formatPhoneInput('', safeDdd)
      : '';
    setForm((prev) => ({ ...prev, phone: formatted }));
  };
  const handleLocalPhoneChange = (value: string) => {
    const local = onlyDigits(value).slice(0, 9);
    const formatted = local
      ? phoneParts.ddd
        ? formatPhoneInput(local, phoneParts.ddd)
        : formatPhoneInput(local)
      : '';
    setForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.termsAccepted || !form.lgpdAccepted) {
      showToast('Aceite os termos e LGPD para continuar.', 'error');
      return;
    }
    if (!form.email || !form.email.includes('@')) {
      showToast('Informe um e-mail válido.', 'error');
      return;
    }
    if (!hasValidPhone(form.phone)) {
      showToast('Informe um telefone válido com DDD.', 'error');
      return;
    }
    if (!form.cpf || !isValidCPF(form.cpf)) {
      showToast('Informe um CPF válido.', 'error');
      return;
    }
    if (!form.address || form.address.trim().length < 8) {
      showToast('Informe seu endereço.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authService.registerMotoboy({
        accountType: 'MOTOBOY',
        user: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          profileImageFile: profilePreview || undefined,
          documentType: 'CPF',
          document: form.cpf,
          address: form.address,
          password: form.password,
        },
        termsAccepted: form.termsAccepted,
        lgpdAccepted: form.lgpdAccepted,
      });
      showToast('Cadastro criado. Verifique seu e-mail.', 'success');
      if (form.email) {
        localStorage.setItem('signupEmail', form.email.trim().toLowerCase());
      }
      navigate('/verify-email', { state: { email: form.email.trim().toLowerCase() } });
    } catch (error: any) {
      if (error?.code === 'AUTH-015') {
        showToast('Esse e-mail já é dono de loja. Use outro para o entregador.', 'error');
      } else if (error?.code === 'AUTH-011') {
        showToast('E-mail já cadastrado. Faça login ou use outro.', 'error');
      } else if (error?.code === 'AUTH-016') {
        showToast('Telefone já cadastrado. Use outro número.', 'error');
      } else if (error?.code === 'AUTH-017') {
        showToast('Telefone inválido. Informe DDD + número.', 'error');
      } else {
        showToast(error?.message || 'Não foi possível cadastrar.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleProfileUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl.startsWith('data:image/')) {
        setProfilePreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10 space-y-6 overflow-x-hidden">
      <MotoboyHeader title="Cadastro" subtitle="Crie sua conta e receba solicitações das lojas." />
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4 overflow-hidden min-w-0">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Use um e-mail diferente do cadastro de lojista.
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-white overflow-hidden grid place-items-center text-slate-500 font-black">
              {profilePreview ? (
                <img src={profilePreview} alt="Foto do perfil" className="h-full w-full object-cover" />
              ) : (
                <span>{String(form.fullName || 'E').trim().slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <label className="text-xs text-slate-600 font-semibold">
              Foto do perfil (opcional)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleProfileUpload(event.target.files?.[0])}
                className="mt-1 block text-[11px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-900 file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
              />
            </label>
          </div>
          <input
            type="text"
            placeholder="Nome completo"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Seu email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <select
              value={phoneParts.ddd || ''}
              onChange={(e) => handleDddChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
            >
              <option value="" disabled>
                DDD
              </option>
              {BRAZIL_DDDS.map((ddd) => (
                <option key={ddd} value={ddd}>
                  {ddd}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              placeholder={phoneParts.ddd ? '99999-9999' : 'Selecione o DDD'}
              value={formatLocalPhoneNumber(phoneParts.localNumber)}
              onChange={(e) => handleLocalPhoneChange(e.target.value)}
              disabled={!phoneParts.ddd}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>
          <input
            type="text"
            placeholder="CPF"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: formatCpfInput(e.target.value) })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Endereço"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
              className="mt-1"
            />
            <span>
              Aceito os{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="text-brand-primary font-semibold underline">
                termos de uso
              </a>
              .
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.lgpdAccepted}
              onChange={(e) => setForm({ ...form, lgpdAccepted: e.target.checked })}
              className="mt-1"
            />
            <span>
              Aceito o uso dos meus dados conforme{' '}
              <a href="/terms#lgpd" target="_blank" rel="noreferrer" className="text-brand-primary font-semibold underline">
                LGPD
              </a>
              .
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/motoboy/login')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Já tenho conta
          </button>
        </form>
      </div>
    </div>
  );
}
