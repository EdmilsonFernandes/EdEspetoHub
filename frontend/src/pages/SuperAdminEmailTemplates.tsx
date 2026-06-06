import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowClockwise,
  EnvelopeSimple,
  Eye,
  FloppyDisk,
  PaperPlaneTilt,
  Plus,
  ShieldCheck,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  EMAIL_CATEGORY_LABELS,
  EmailHealthPayload,
  EmailSuppressionPayload,
  EmailTemplateCategory,
  EmailTemplatePayload,
  RenderedEmailPayload,
  emailTemplateService,
} from '../services/emailTemplateService';
import { useToast } from '../contexts/ToastContext';

const CATEGORY_OPTIONS = Object.entries(EMAIL_CATEGORY_LABELS) as Array<[EmailTemplateCategory, string]>;

const sampleValueFor = (name: string) => {
  const key = name.toUpperCase();
  if (key.includes('EMAIL')) return 'cliente@exemplo.com';
  if (key.includes('NAME')) return 'Edmilson';
  if (key.includes('URL') || key.includes('LINK')) return 'https://janocaminho.com.br';
  if (key.includes('CODE')) return key.includes('SPACED') ? '1 2 3 4' : '1234';
  if (key.includes('AMOUNT')) return 'R$ 69,90';
  if (key.includes('DAYS')) return '7';
  if (key.includes('STORE')) return 'Gustavão Espetos';
  if (key.includes('MOTOBOY')) return 'Carlos Entregas';
  if (key.includes('ORDER')) return '#A1B2C3D4';
  return `Exemplo ${name}`;
};

const variablesToObject = (variables: string[]) =>
  variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable] = sampleValueFor(variable);
    return acc;
  }, {});

const variablesFromText = (value: string) =>
  Array.from(
    new Set(
      String(value || '')
        .split(/[\n,; ]+/)
        .map((item) => item.trim().replace(/[^\w]/g, ''))
        .filter(Boolean)
    )
  );

export function SuperAdminEmailTemplates() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplatePayload[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<EmailTemplatePayload | null>(null);
  const [preview, setPreview] = useState<RenderedEmailPayload | null>(null);
  const [suppressions, setSuppressions] = useState<EmailSuppressionPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [health, setHealth] = useState<EmailHealthPayload | null>(null);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === selectedKey) || null,
    [selectedKey, templates]
  );
  const previewVariables = useMemo(() => variablesToObject(draft?.variables || []), [draft?.variables]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [templateList, suppressionList, healthOverview] = await Promise.all([
        emailTemplateService.listTemplates(),
        emailTemplateService.listSuppressions(),
        emailTemplateService.getHealth(),
      ]);
      setTemplates(templateList);
      setSuppressions(suppressionList);
      setHealth(healthOverview);
      const nextKey = selectedKey || templateList[0]?.key || '';
      setSelectedKey(nextKey);
      const selected = templateList.find((template: EmailTemplatePayload) => template.key === nextKey) || templateList[0] || null;
      setDraft(selected ? { ...selected } : null);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar templates de e-mail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    setDraft({ ...selectedTemplate });
    setPreview(null);
  }, [selectedTemplate]);

  const refreshPreview = async () => {
    if (!draft) return;
    try {
      const rendered = await emailTemplateService.previewTemplate(draft.key, previewVariables);
      setPreview(rendered);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível gerar o preview.', 'error');
    }
  };

  useEffect(() => {
    if (draft && !preview) void refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.key]);

  const updateDraft = (key: keyof EmailTemplatePayload, value: any) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await emailTemplateService.saveTemplate(draft.key, draft);
      setTemplates((current) => current.map((template) => (template.key === saved.key ? saved : template)));
      setDraft(saved);
      showToast('Template salvo com sucesso.', 'success');
      void refreshPreview();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar o template.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!draft) return;
    try {
      await emailTemplateService.sendTest(draft.key, testEmail, previewVariables);
      showToast('E-mail de teste enviado.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível enviar o teste.', 'error');
    }
  };

  const addSuppression = async () => {
    if (!manualEmail.trim()) return;
    try {
      await emailTemplateService.createSuppression(manualEmail, 'marketing', manualReason);
      setManualEmail('');
      setManualReason('');
      setSuppressions(await emailTemplateService.listSuppressions());
      showToast('Descadastro cadastrado.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível cadastrar o descadastro.', 'error');
    }
  };

  const removeSuppression = async (id: string) => {
    try {
      await emailTemplateService.removeSuppression(id);
      setSuppressions((current) => current.filter((item) => item.id !== id));
      showToast('Descadastro removido.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível remover o descadastro.', 'error');
    }
  };

  return (
    <AdminLayout contextLabel="E-mails" showHeader={false}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(95,211,90,0.13),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4f3_100%)] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-48px_rgba(15,58,76,0.55)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#153A4C] text-white shadow-[0_18px_36px_-24px_rgba(21,58,76,0.75)]">
                  <EnvelopeSimple size={28} weight="duotone" />
                </div>
                <div>
                  <Link to="/superadmin" className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
                    Super Admin
                  </Link>
                  <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">E-mails e Templates</h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Templates no banco, preview premium, teste de envio e descadastro de marketing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-[#336886]/25 hover:text-[#336886]"
              >
                <ArrowClockwise size={17} weight="bold" />
                Atualizar
              </button>
            </div>
          </header>

          {error ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>
          ) : null}

          {health ? (
            <section
              className={`rounded-[1.75rem] border p-4 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.38)] backdrop-blur ${
                health.status === 'healthy'
                  ? 'border-emerald-100 bg-emerald-50/80'
                  : health.status === 'warning'
                    ? 'border-amber-100 bg-amber-50/85'
                    : 'border-rose-100 bg-rose-50/90'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      health.status === 'healthy'
                        ? 'bg-emerald-100 text-emerald-700'
                        : health.status === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {health.status === 'healthy' ? <ShieldCheck size={24} weight="duotone" /> : <WarningCircle size={24} weight="duotone" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Saúde do envio</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      {health.status === 'healthy'
                        ? 'E-mails operando normalmente'
                        : health.status === 'warning'
                          ? 'Falhas recentes no envio'
                          : 'Atenção: provedor de e-mail pode estar bloqueando envios'}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                      {health.suggestedAction || 'Acompanhe os últimos envios e faça um teste antes de liberar novos cadastros.'}
                    </p>
                    {health.latest?.errorMessage ? (
                      <p className="mt-2 max-w-3xl rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-600">
                        Último erro: {health.latest.errorMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[300px]">
                  <div className="rounded-2xl bg-white/75 px-3 py-2">
                    <p className="text-lg font-black text-slate-950">{health.sentLastHour}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">enviados 1h</p>
                  </div>
                  <div className="rounded-2xl bg-white/75 px-3 py-2">
                    <p className="text-lg font-black text-slate-950">{health.failedLastHour}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">falhas 1h</p>
                  </div>
                  <div className="rounded-2xl bg-white/75 px-3 py-2">
                    <p className="text-lg font-black text-slate-950">{health.failedLast15Min}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">falhas 15m</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-[1.75rem] border border-white/80 bg-white/86 p-3 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.35)] backdrop-blur">
              <div className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Templates</div>
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  ))
                ) : templates.length ? (
                  templates.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setSelectedKey(template.key)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selectedKey === template.key
                          ? 'border-[#336886]/30 bg-[#eef7f8] shadow-sm'
                          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-black text-slate-950">{template.name}</p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          {EMAIL_CATEGORY_LABELS[template.category]}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{template.description}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum template encontrado.</div>
                )}
              </div>
            </aside>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_20px_58px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
                {!draft ? (
                  <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                    Selecione um template para editar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{draft.key}</p>
                        <input
                          value={draft.name}
                          onChange={(event) => updateDraft('name', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xl font-black text-slate-950 outline-none focus:border-[#336886]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={refreshPreview}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                        >
                          <Eye size={16} weight="bold" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={save}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                        >
                          <FloppyDisk size={16} weight="bold" />
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft('description', event.target.value)}
                      rows={2}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 outline-none focus:border-[#336886]"
                      placeholder="Descrição interna do template"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Categoria
                        <select
                          value={draft.category}
                          onChange={(event) => {
                            const category = event.target.value as EmailTemplateCategory;
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    category,
                                    allowUnsubscribe: category === 'marketing' ? current.allowUnsubscribe : false,
                                  }
                                : current
                            );
                          }}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-[#336886]"
                        >
                          {CATEGORY_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Ativo
                        <select
                          value={draft.active ? 'true' : 'false'}
                          onChange={(event) => updateDraft('active', event.target.value === 'true')}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-[#336886]"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </label>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Unsubscribe
                        <select
                          value={draft.allowUnsubscribe ? 'true' : 'false'}
                          disabled={draft.category !== 'marketing'}
                          onChange={(event) => updateDraft('allowUnsubscribe', event.target.value === 'true')}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#336886]"
                        >
                          <option value="false">Não se aplica</option>
                          <option value="true">Permitir descadastro</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Assunto
                      <input
                        value={draft.subject}
                        onChange={(event) => updateDraft('subject', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-[#336886]"
                      />
                    </label>

                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Preheader
                      <input
                        value={draft.preheader}
                        onChange={(event) => updateDraft('preheader', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-[#336886]"
                      />
                    </label>

                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Corpo texto
                      <textarea
                        value={draft.textBody}
                        onChange={(event) => updateDraft('textBody', event.target.value)}
                        rows={6}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs normal-case tracking-normal text-slate-700 outline-none focus:border-[#336886]"
                      />
                    </label>

                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Corpo HTML
                      <textarea
                        value={draft.htmlBody}
                        onChange={(event) => updateDraft('htmlBody', event.target.value)}
                        rows={10}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs normal-case tracking-normal text-slate-700 outline-none focus:border-[#336886]"
                      />
                    </label>

                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Variáveis permitidas
                      <textarea
                        value={draft.variables.join('\n')}
                        onChange={(event) => updateDraft('variables', variablesFromText(event.target.value))}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs normal-case tracking-normal text-slate-700 outline-none focus:border-[#336886]"
                      />
                    </label>
                  </div>
                )}
              </div>

              <aside className="space-y-5">
                <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_58px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Preview</p>
                      <h2 className="text-lg font-black text-slate-950">Como chega no e-mail</h2>
                    </div>
                    <ShieldCheck size={24} weight="duotone" className="text-[#336886]" />
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Assunto</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{preview?.subject || draft?.subject || '-'}</p>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {preview?.html ? (
                      <iframe title="Preview do e-mail" srcDoc={preview.html} className="h-[520px] w-full bg-white" />
                    ) : (
                      <div className="flex h-[360px] items-center justify-center p-5 text-center text-sm font-semibold text-slate-500">
                        Gere o preview para visualizar.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={testEmail}
                      onChange={(event) => setTestEmail(event.target.value)}
                      placeholder="email@teste.com"
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#336886]"
                    />
                    <button
                      type="button"
                      onClick={sendTest}
                      className="inline-flex items-center gap-1 rounded-2xl bg-[#153A4C] px-3 py-2.5 text-sm font-black text-white"
                    >
                      <PaperPlaneTilt size={16} weight="bold" />
                      Teste
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_58px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Descadastros</p>
                  <h2 className="text-lg font-black text-slate-950">Não receber marketing</h2>
                  <div className="mt-4 grid gap-2">
                    <input
                      value={manualEmail}
                      onChange={(event) => setManualEmail(event.target.value)}
                      placeholder="email@cliente.com"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#336886]"
                    />
                    <input
                      value={manualReason}
                      onChange={(event) => setManualReason(event.target.value)}
                      placeholder="Motivo opcional"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#336886]"
                    />
                    <button
                      type="button"
                      onClick={addSuppression}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#336886]/20 bg-[#eef7f8] px-4 py-3 text-sm font-black text-[#153A4C]"
                    >
                      <Plus size={16} weight="bold" />
                      Adicionar descadastro
                    </button>
                  </div>
                  <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
                    {suppressions.length ? (
                      suppressions.map((suppression) => (
                        <div key={suppression.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{suppression.email}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{suppression.category}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSuppression(suppression.id)}
                            className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50"
                            title="Remover descadastro"
                          >
                            <Trash size={16} weight="bold" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum descadastro cadastrado.</div>
                    )}
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
