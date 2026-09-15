import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrmService } from './crm.service';
import {
  DOCUMENT_CHECKLIST,
  reviewDocumentChecklist,
  SaveChecklistDto,
} from './document-checklist';

const complete = {
  items: DOCUMENT_CHECKLIST.map((item) => ({ ...item, received: true })),
  exceptionReason: '',
};
const exception = {
  items: [],
  exceptionReason: 'Справки принесут до первого посещения',
};
const actor = { id: 'director', role: 'director' };
const input = {
  groupId: 'group',
  startsOn: '2026-10-01',
  childName: 'Ребенок',
  birthDate: '2022-01-01',
  revision: 1,
  phone: '8 (999) 123-45-67',
  parentName: ' Родитель ',
  email: 'parent@example.invalid',
};
function setup() {
  let lead: any = {
    id: 'lead',
    state: 'open',
    revision: 1,
    phone: '',
    parentName: 'Родитель',
    documentChecklist: null,
  };
  const enrollment = { id: 'admission', child: { id: 'child' } };
  const tx = {
    $queryRaw: jest.fn(),
    crmLead: {
      findUnique: jest.fn(async () => ({ ...lead })),
      update: jest.fn(
        async ({ data }) =>
          (lead = { ...lead, ...data, revision: lead.revision + 1 }),
      ),
    },
    enrollment: {
      findUnique: jest.fn(async () => enrollment),
      update: jest.fn(async ({ data }) => ({ ...enrollment, ...data })),
    },
    user: { findUnique: jest.fn(async () => null) },
    group: { findUnique: jest.fn(async () => ({ id: 'group', capacity: 10 })) },
    child: { count: jest.fn(async () => 0) },
  };
  const prisma = { ...tx, $transaction: (fn: any) => fn(tx) };
  const admissions = { enroll: jest.fn(async () => enrollment) };
  return {
    tx,
    admissions,
    service: new CrmService(
      prisma as any,
      admissions as any,
      {} as any,
      {} as any,
    ),
  };
}

describe('Admission document checklist', () => {
  it('restores missing core documents and prevents silently making them optional', () => {
    expect(reviewDocumentChecklist(null).missing).toHaveLength(4);
    const forged = {
      items: [
        { id: 'signed_contract', title: 'X', required: false, received: false },
      ],
      exceptionReason: '     ok     ',
    };
    const result = reviewDocumentChecklist(forged);
    expect(result.ready).toBe(false);
    expect(result.items[0]).toMatchObject({
      title: 'Подписанный договор',
      required: true,
    });
    expect(reviewDocumentChecklist(complete).ready).toBe(true);
    expect(reviewDocumentChecklist(exception).ready).toBe(true);
    expect(
      reviewDocumentChecklist({
        ...complete,
        items: [
          ...complete.items,
          { id: 'extra', title: 'Допуск', required: true, received: false },
        ],
      }).ready,
    ).toBe(false);
  });
  it('validates nested booleans, unique IDs, revision and reason limits', async () => {
    const validateInput = (payload: object) =>
      validate(plainToInstance(SaveChecklistDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    expect(await validateInput({ ...complete, revision: 1 })).toEqual([]);
    for (const payload of [
      { ...complete, revision: 0 },
      { ...complete, revision: 1, exceptionReason: 'a'.repeat(2001) },
      {
        ...complete,
        revision: 1,
        items: [complete.items[0], complete.items[0]],
      },
      {
        ...complete,
        revision: 1,
        items: [{ ...complete.items[0], received: 'true' }],
      },
    ])
      expect((await validateInput(payload)).length).toBeGreaterThan(0);
  });
  it('blocks direct enrollment without documents or an exception even if the UI is bypassed', async () => {
    const { service, admissions, tx } = setup();
    expect((await service.checkEnrollment('lead', input)).ready).toBe(false);
    await expect(service.enroll('lead', input, actor)).rejects.toThrow(
      'Отметьте обязательные документы',
    );
    expect(admissions.enroll).not.toHaveBeenCalled();
    expect(tx.crmLead.update).not.toHaveBeenCalled();
  });
  it('stores a draft with revision control and uses it for the final enrollment', async () => {
    const { service, tx, admissions } = setup();
    const saved = await service.saveDocumentChecklist(
      'lead',
      { ...exception, revision: 1 },
      actor,
    );
    expect(saved.revision).toBe(2);
    await expect(
      service.saveDocumentChecklist(
        'lead',
        { ...complete, revision: 1 },
        actor,
      ),
    ).rejects.toThrow('Заявка изменена');
    const dto = { ...input, revision: 2 };
    expect((await service.checkEnrollment('lead', dto)).ready).toBe(true);
    await service.enroll('lead', dto, actor);
    expect(admissions.enroll).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        phone: '+79991234567',
        parentName: 'Родитель',
        requestKey: 'lead:lead',
      }),
      actor.id,
    );
    const snapshot =
      tx.enrollment.update.mock.calls[0][0].data.documentChecklist;
    expect(snapshot).toMatchObject({
      exceptionReason: exception.exceptionReason,
      checkedById: actor.id,
    });
    expect(snapshot.missingAtEnrollment).toHaveLength(4);
    expect(snapshot.checkedAt).toEqual(expect.any(String));
    const leadData = tx.crmLead.update.mock.calls[1][0].data;
    expect(leadData.documentChecklist).toEqual(snapshot);
    expect(leadData.history.create.text).toContain(exception.exceptionReason);
    await service.enroll('lead', { ...input, revision: 1 }, actor);
    expect(admissions.enroll).toHaveBeenCalledTimes(1);
    expect(tx.enrollment.update).toHaveBeenCalledTimes(1);
  });
  it('ignores an obsolete exception when the complete set is received', async () => {
    const { service, tx } = setup();
    await service.enroll(
      'lead',
      {
        ...input,
        documentChecklist: {
          ...complete,
          exceptionReason: exception.exceptionReason,
        },
      },
      actor,
    );
    expect(
      tx.enrollment.update.mock.calls[0][0].data.documentChecklist,
    ).toMatchObject({ missingAtEnrollment: [], exceptionReason: '' });
  });
});
