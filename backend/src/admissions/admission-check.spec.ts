import { checkAdmission } from './admission-check';

describe('Enrollment checklist', () => {
  const db = () => ({
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    group: {
      findUnique: jest.fn().mockResolvedValue({ id: 'group', capacity: 10 }),
    },
    child: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(1),
    },
  });
  const complete = {
    childName: 'Ребенок',
    birthDate: '2022-01-01',
    startsOn: '2026-10-01',
    parentName: 'Родитель',
    phone: '+79991234567',
    email: 'parent@example.invalid',
    groupId: 'group',
  };
  it('reports all missing essentials together and permits a complete new family', async () => {
    const missing = await checkAdmission(db() as any, {});
    expect(missing.ready).toBe(false);
    expect(missing.missing).toHaveLength(7);
    expect(await checkAdmission(db() as any, complete)).toMatchObject({
      ready: true,
      missing: [],
      parentAccess: 'invite',
    });
  });
  it('rejects impossible dates, employee accounts and full groups', async () => {
    const client = db();
    client.user.findUnique.mockResolvedValue({ id: 'staff', role: 'teacher' });
    client.child.count.mockResolvedValue(10);
    const result = await checkAdmission(client as any, {
      ...complete,
      birthDate: '2022-02-30',
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        'Корректная дата рождения ребенка',
        'Свободное место в группе',
        'Действующий аккаунт родителя: email сотрудника использовать нельзя',
      ]),
    );
  });
  it('requires explicit selection of an existing child and preserves active parent access', async () => {
    const client = db();
    client.user.findUnique.mockResolvedValue({
      id: 'parent',
      role: 'parent',
      consentGivenAt: new Date(),
    });
    client.child.findFirst.mockResolvedValue({ id: 'child' });
    expect((await checkAdmission(client as any, complete)).ready).toBe(false);
    client.child.findUnique.mockResolvedValue({
      id: 'child',
      parents: [{ parentId: 'parent' }],
    });
    expect(
      await checkAdmission(client as any, { ...complete, childId: 'child' }),
    ).toMatchObject({ ready: true, parentAccess: 'active' });
  });
});
