import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/data';
import { Drawer, useToast } from '@/components/ui/overlays';
import { Button, Checkbox, Field, Input, Textarea } from '@/components/ui/primitives';
import { useQueryClient } from '@tanstack/react-query';
import { useErrorText, useI18n } from '@/i18n';
import { ApiError, api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublishedCourses } from '@/lib/queries';
import type { Student } from '@/lib/types';
import { toDateInput } from '@/lib/utils';
import { rules, validate } from '@/lib/validation';
import { CredentialsModal, ImageUpload, Pair, Panel } from './shared';

type Values = { firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; address: string };
const empty: Values = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', address: '' };

/** Best-effort split of a full name from a contact request ("Ahmed Ben Ali" → Ahmed / Ben Ali). */
export const splitName = (full: string) => {
  const [first = '', ...rest] = full.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(' ') };
};

function Fields({ values, set, errors, showEmail = true }: { values: Values; set: (k: keyof Values, v: string) => void; errors: Record<string, string>; showEmail?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <Pair>
        <Field label={t('admin.students.form.firstName')} required error={errors.firstName}><Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="off" maxLength={80} data-autofocus /></Field>
        <Field label={t('admin.students.form.lastName')} required error={errors.lastName}><Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="off" maxLength={80} /></Field>
      </Pair>
      {showEmail && <Field label={t('admin.students.form.email')} required error={errors.email}><Input type="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} autoComplete="off" /></Field>}
      <Pair>
        <Field label={t('admin.students.form.phone')} optionalLabel={t('common.optional')} error={errors.phone}><Input type="tel" inputMode="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="off" /></Field>
        <Field label={t('admin.students.form.dob')} optionalLabel={t('common.optional')} error={errors.dateOfBirth}><Input type="date" max={toDateInput(new Date().toISOString())} value={values.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
      </Pair>
      <Field label={t('admin.students.form.address')} optionalLabel={t('common.optional')} error={errors.address}><Textarea rows={2} maxLength={300} value={values.address} onChange={(e) => set('address', e.target.value)} /></Field>
    </div>
  );
}

const validateValues = (v: Values, needEmail: boolean) => validate(v, { firstName: [rules.required], lastName: [rules.required], ...(needEmail ? { email: [rules.email] } : {}), phone: [rules.optionalPhone] });

/**
 * Create-a-student form. Reused by the "Add student" page and by the contact-request workflow
 * (pre-filled from the lead, with the request linked to the new student).
 */
export function NewStudentForm({ initial, defaultCourseIds = [], contactMessageId, onCreated, embedded }: { initial?: Partial<Values>; defaultCourseIds?: string[]; contactMessageId?: string; onCreated?: () => void; embedded?: boolean }) {
  const { t, pick } = useI18n();
  const errorText = useErrorText();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: courses = [] } = usePublishedCourses();
  const [values, setValues] = useState<Values>({ ...empty, ...initial });
  const [courseIds, setCourseIds] = useState<string[]>(defaultCourseIds);
  const [manual, setManual] = useState(false);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingId, setExistingId] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string; studentId: string; warning: string | null } | null>(null);

  const set = (k: keyof Values, v: string) => { setValues((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); setExistingId(null); };

  const create = useMutation({
    mutationFn: () => api.post<{ student: Student; temporaryPassword: string | null; enrollments: { ok: boolean; error?: string }[] }>('/students', {
      ...values,
      email: values.email.trim(),
      phone: values.phone.trim() || null, dateOfBirth: values.dateOfBirth || null, address: values.address.trim() || null,
      ...(manual ? { password } : {}),
      enrollCourseIds: courseIds,
      ...(contactMessageId ? { contactMessageId } : {}),
    }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      const failed = res.enrollments.some((e) => !e.ok);
      const warning = failed ? t('admin.students.credentials.enrollmentIssue') : null;
      if (res.temporaryPassword) setCreated({ email: res.student.email, password: res.temporaryPassword, studentId: res.student.id, warning });
      else {
        toast.success(t('admin.students.detail.toast.created'));
        onCreated ? onCreated() : navigate(`/admin/students/${res.student.id}`);
      }
    },
    onError: (err) => {
      const fields = errorText.fields(err);
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        fields.email = errorText.message(err);
        setExistingId((err.details as { studentId?: string } | undefined)?.studentId ?? null);
      }
      setErrors(fields);
      if (!Object.keys(fields).length) toast.error(errorText.message(err));
    },
  });

  const submit = () => {
    const issues = validateValues(values, true);
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errorText.field({ field: k, ...i! })]));
    if (manual && password.length < 8) messages.password = errorText.field({ field: 'password', code: password ? 'too_short' : 'required', min: 8 });
    setErrors(messages);
    if (!Object.keys(messages).length) create.mutate();
  };

  const done = () => {
    const id = created?.studentId;
    setCreated(null);
    if (onCreated) onCreated();
    else if (id) navigate(`/admin/students/${id}`);
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-6">
        <Fields values={values} set={set} errors={errors} />
        {existingId && <p className="-mt-3 text-sm"><Link to={`/admin/students/${existingId}`} className="font-semibold text-brand-700 hover:underline">{t('admin.students.form.openExisting')} →</Link></p>}
        <p className="text-xs text-slate-500">{t('admin.students.form.dataNote')}</p>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">{t('admin.students.form.enroll')}</legend>
          <p className="mb-2 text-xs text-slate-500">{t('admin.students.form.enrollHint')}</p>
          <div className="grid max-h-56 justify-items-start gap-2.5 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {courses.length === 0 ? <p className="text-sm text-slate-500">—</p> : courses.map((c) => (
              <Checkbox key={c.id} checked={courseIds.includes(c.id)} onChange={(e) => setCourseIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))} label={<span>{pick(c, 'title')}{c.academicYear && <span className="ml-2 text-xs text-slate-400">{pick(c.academicYear, 'name')}</span>}</span>} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">{t('admin.students.form.password')}</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"><input type="radio" name="pw" className="accent-brand-600" checked={!manual} onChange={() => setManual(false)} />{t('admin.students.form.passwordAuto')}</label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"><input type="radio" name="pw" className="accent-brand-600" checked={manual} onChange={() => setManual(true)} />{t('admin.students.form.passwordManual')}</label>
          </div>
          {manual && <div className="mt-3 max-w-sm"><Field label={t('admin.students.form.password')} hint={t('admin.students.form.passwordHint')} error={errors.password} required><Input type="text" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: '' })); }} /></Field></div>}
        </fieldset>

        <div className={embedded ? 'flex justify-end' : 'flex justify-end border-t border-slate-100 pt-5'}>
          <Button type="submit" loading={create.isPending} iconLeft={<UserPlus className="h-4 w-4" aria-hidden />}>{t('admin.students.form.create')}</Button>
        </div>
      </form>
      {created && <CredentialsModal open onClose={done} email={created.email} password={created.password} studentId={created.studentId} warning={created.warning} />}
    </>
  );
}

export default function NewStudentPage() {
  const { t } = useI18n();
  useDocumentTitle(t('admin.students.form.title'));
  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('admin.nav.students'), to: '/admin/students' }, { label: t('admin.students.form.title') }]} title={t('admin.students.form.title')} description={t('admin.students.form.subtitle')} />
      <Panel className="max-w-3xl"><NewStudentForm /></Panel>
    </>
  );
}

/** Edit profile fields (name, e-mail, phone, birth date, address, photo). Status changes live on the student page. */
export function EditStudentDrawer({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [values, setValues] = useState<Values>({ firstName: student.firstName, lastName: student.lastName, email: student.email, phone: student.phone ?? '', dateOfBirth: toDateInput(student.dateOfBirth), address: student.address ?? '' });
  const [photo, setPhoto] = useState<string | null>(student.profilePhotoUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof Values, v: string) => { setValues((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const save = useMutation({
    mutationFn: () => api.put(`/students/${student.id}`, { ...values, email: values.email.trim(), phone: values.phone.trim() || null, dateOfBirth: values.dateOfBirth || null, address: values.address.trim() || null, profilePhotoUrl: photo }),
    onSuccess: onSaved,
    onError: (err) => setErrors(Object.keys(errorText.fields(err)).length ? errorText.fields(err) : { email: errorText.message(err) }),
  });
  const submit = () => {
    const issues = validateValues(values, true);
    const messages = Object.fromEntries(Object.entries(issues).map(([k, i]) => [k, errorText.field({ field: k, ...i! })]));
    setErrors(messages);
    if (!Object.keys(messages).length) save.mutate();
  };

  return (
    <Drawer open onClose={onClose} title={t('admin.students.form.editTitle')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={save.isPending}>{t('common.save')}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-6">
        <ImageUpload kind="avatars" value={photo} onChange={setPhoto} labels={{ choose: t('common.upload'), replace: t('common.changePhoto'), remove: t('common.remove') }} />
        <Fields values={values} set={set} errors={errors} />
        <button type="submit" className="sr-only" tabIndex={-1}>{t('common.save')}</button>
      </form>
    </Drawer>
  );
}
