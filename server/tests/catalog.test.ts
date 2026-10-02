import { describe, expect, it } from 'vitest';
import { Category, Enrollment } from '../src/db';
import { adminClient, client, makeCategory, makeCourse, makeStudent, makeYear, studentClient, useTestDatabase } from './helpers';

describe('public catalog', () => {
  useTestDatabase();

  it('lists only PUBLISHED courses and hides drafts and archived courses', async () => {
    await makeCourse({ slug: 'live', status: 'PUBLISHED' });
    await makeCourse({ slug: 'wip', status: 'DRAFT' });
    await makeCourse({ slug: 'old', status: 'ARCHIVED' });
    const res = await client().get('/api/courses?status=PUBLISHED');
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { slug: string }) => c.slug)).toEqual(['live']);
    expect(res.body.meta.total).toBe(1);
  });

  it('refuses visitors and students who ask for non-published statuses (no draft discovery)', async () => {
    await makeCourse({ slug: 'wip', status: 'DRAFT' });
    expect((await client().get('/api/courses?status=DRAFT')).status).toBe(403);
    expect((await client().get('/api/courses?status=ALL')).status).toBe(403);
    const { agent } = await studentClient();
    expect((await agent.get('/api/courses?status=DRAFT')).status).toBe(403);
    // …and a direct request for the draft looks exactly like a missing course.
    expect((await client().get('/api/courses/wip')).status).toBe(404);
  });

  it('exposes grouping data (category + academic year) from the database, in sort order', async () => {
    await makeCourse({ slug: 'a', year: '3rd-year' });
    await makeCourse({ slug: 'b', year: '2nd-year' });
    const res = await client().get('/api/courses');
    const years = res.body.data.map((c: { academicYear: { slug: string } }) => c.academicYear.slug).sort();
    expect(years).toEqual(['2nd-year', '3rd-year']);
    expect(res.body.data[0].category).toMatchObject({ slug: 'technology' });
  });

  it('never leaks lesson content, videos or resources through the public course page', async () => {
    const { course } = await makeCourse();
    const res = await client().get(`/api/courses/${course.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.modules).toHaveLength(2);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/SECRET CONTENT|CONTENU SECRET|private-video|content_en|videoUrl|resources/);
  });

  it('finds courses accent- and case-insensitively', async () => {
    const { course } = await makeCourse({ slug: 'compta' });
    course.title_fr = 'Comptabilité Intermédiaire';
    course.title_en = 'Intermediate Accounting';
    await course.save();
    const res = await client().get('/api/courses?q=comptabilite');
    expect(res.body.data).toHaveLength(1);
    expect((await client().get('/api/courses?q=zzz-nothing')).body.data).toHaveLength(0);
  });

  it('hides the price unless the admin enabled it for the course', async () => {
    const { course } = await makeCourse();
    course.price = 250;
    course.showPrice = false;
    await course.save();
    expect((await client().get(`/api/courses/${course.slug}`)).body.data.price).toBeNull();
    course.showPrice = true;
    await course.save();
    expect((await client().get(`/api/courses/${course.slug}`)).body.data.price).toBe(250);
  });

  it('rejects malformed query parameters and cannot be tricked with operator syntax', async () => {
    await makeCourse({ slug: 'live' });
    await makeCourse({ slug: 'wip', status: 'DRAFT' });
    // Operator-style keys never become Mongo operators; the drafts stay hidden either way.
    const tricked = await client().get('/api/courses?status[$ne]=PUBLISHED');
    expect(tricked.body.data.map((c: { slug: string }) => c.slug)).toEqual(['live']);
    // A repeated parameter (array) is not a valid enum value.
    expect((await client().get('/api/courses?status=PUBLISHED&status=DRAFT')).status).toBe(400);
    expect((await client().get('/api/courses?page=-1')).status).toBe(400);
    expect((await client().get('/api/courses?pageSize=9999')).status).toBe(400);
    expect((await client().get('/api/courses?academicYear=not-an-id')).status).toBe(400);
  });
});

describe('course administration', () => {
  useTestDatabase();

  it('requires an admin for every write', async () => {
    const { course } = await makeCourse();
    const anonymous = client();
    const { agent: student } = await studentClient();
    for (const who of [anonymous, student]) {
      expect((await who.post('/api/courses').send({ title_fr: 'y', category: String(course.category) })).status).toBeGreaterThanOrEqual(401);
      expect((await who.put(`/api/courses/${course.id}`).send({ title_en: 'hacked' })).status).toBeGreaterThanOrEqual(401);
      expect((await who.delete(`/api/courses/${course.id}`)).status).toBeGreaterThanOrEqual(401);
      expect((await who.patch(`/api/courses/${course.id}/publish`)).status).toBeGreaterThanOrEqual(401);
    }
  });

  it('creates a DRAFT with a generated slug and ignores mass-assigned fields', async () => {
    const admin = await adminClient();
    const cat = await makeCategory();
    const res = await admin.post('/api/courses').send({
      title_en: 'Python for Beginners', // English is no longer accepted: ignored
      title_fr: 'Python pour débutants',
      category: cat.id,
      status: 'PUBLISHED', // must be ignored
      publishedAt: '2020-01-01',
      _id: '64b000000000000000000000',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ slug: 'python-pour-debutants', status: 'DRAFT', publishedAt: null, title_en: '' });
    expect(res.body.data.id).not.toBe('64b000000000000000000000');
    const again = await admin.post('/api/courses').send({ title_fr: 'Python pour débutants', category: cat.id });
    expect(again.body.data.slug).toBe('python-pour-debutants-2');
  });

  it('requires the French title and validates fields with codes the UI can translate', async () => {
    const admin = await adminClient();
    const res = await admin.post('/api/courses').send({ title_fr: '', category: 'nope' });
    expect(res.status).toBe(400);
    const fields = Object.fromEntries(res.body.error.details.map((d: { field: string; code: string }) => [d.field, d.code]));
    expect(fields).toMatchObject({ title_fr: 'required', category: 'invalid_id' });
  });

  it('cannot be published until it is complete, then publishes and becomes public', async () => {
    const admin = await adminClient();
    const cat = await makeCategory();
    const created = await admin.post('/api/courses').send({ title_fr: 'Web Dev', category: cat.id });
    const id = created.body.data.id;

    const blocked = await admin.patch(`/api/courses/${id}/publish`);
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.code).toBe('COURSE_NOT_PUBLISHABLE');
    const codes = blocked.body.error.details.map((i: { code: string }) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['shortDescription_fr', 'description_fr', 'no_modules']));
    expect(codes.some((c: string) => c.endsWith('_en'))).toBe(false); // English is never required
    expect((await client().get('/api/courses/web-dev')).status).toBe(404);

    await admin.put(`/api/courses/${id}`).send({ shortDescription_fr: 's', description_fr: 'd' });
    const mod = await admin.post('/api/modules').send({ courseId: id, title_fr: 'Intro' });
    await admin.post('/api/lessons').send({ moduleId: mod.body.data.id, title_fr: 'Bonjour' });

    const ok = await admin.patch(`/api/courses/${id}/publish`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('PUBLISHED');
    expect((await client().get('/api/courses/web-dev')).status).toBe(200);

    expect((await admin.patch(`/api/courses/${id}/unpublish`)).body.data.status).toBe('DRAFT');
    expect((await client().get('/api/courses/web-dev')).status).toBe(404);
    expect((await admin.patch(`/api/courses/${id}/archive`)).body.data.status).toBe('ARCHIVED');
  });

  it('lets an admin preview drafts through the normal detail endpoint', async () => {
    const admin = await adminClient();
    const { course } = await makeCourse({ status: 'DRAFT' });
    const res = await admin.get(`/api/courses/${course.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.readiness.ok).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('refuses to delete a course that has enrolled students, but deletes an unused one with its content', async () => {
    const admin = await adminClient();
    const { course } = await makeCourse({ slug: 'used' });
    const student = await makeStudent();
    await Enrollment.create({ student: student._id, course: course._id });
    const refused = await admin.delete(`/api/courses/${course.id}`);
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('COURSE_HAS_ENROLLMENTS');

    const { course: unused } = await makeCourse({ slug: 'unused' });
    expect((await admin.delete(`/api/courses/${unused.id}`)).status).toBe(204);
    expect((await admin.get(`/api/courses/${unused.id}`)).status).toBe(404);
  });

  it('manages categories and academic years, protecting the ones in use', async () => {
    const admin = await adminClient();
    const created = await admin.post('/api/categories').send({ name_fr: 'Marketing' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('marketing');
    expect((await admin.post('/api/categories').send({ name_fr: 'Marketing', slug: 'marketing' })).status).toBe(409);

    const year = await admin.post('/api/academic-years').send({ name_fr: '4e année' });
    expect(year.status).toBe(201);

    const { category, year: usedYear } = await makeCourse({ slug: 'c1', year: '2nd-year' });
    expect((await admin.delete(`/api/categories/${category.id}`)).body.error.code).toBe('CATEGORY_IN_USE');
    expect((await admin.delete(`/api/academic-years/${usedYear!.id}`)).body.error.code).toBe('ACADEMIC_YEAR_IN_USE');
    expect((await admin.delete(`/api/categories/${created.body.data.id}`)).status).toBe(204);
    expect(await Category.exists({ slug: 'marketing' })).toBeNull();

    // Public taxonomy lists only what has published courses when asked to.
    const list = await client().get('/api/categories?withCourses=true');
    expect(list.body.data.map((c: { slug: string }) => c.slug)).toEqual(['technology']);
    expect((await client().get('/api/academic-years')).status).toBe(200);
    await makeYear('3rd-year');
  });
});
