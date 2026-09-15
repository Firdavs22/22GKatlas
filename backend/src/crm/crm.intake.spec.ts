import { CrmService } from './crm.service';
import { tildaFields } from './tilda.controller';

describe('Messenger leads through CRM', () => {
  function setup() {
    let lead: any = null;
    const tx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      crmStage: { findFirst: jest.fn().mockResolvedValue({ id: 'new' }) },
      crmLead: {
        findUnique: jest.fn(async () => lead),
        create: jest.fn(
          async ({ data }: any) =>
            (lead = { id: 'lead', state: 'open', revision: 1, ...data }),
        ),
        update: jest.fn(async ({ data }: any) => (lead = { ...lead, ...data })),
        findMany: jest.fn(),
      },
    };
    const prisma = { ...tx, $transaction: (fn: any) => fn(tx) };
    const admissions = { enroll: jest.fn() };
    const service = new CrmService(
      prisma as any,
      admissions as any,
      {} as any,
      {} as any,
    );
    return { tx, admissions, service };
  }
  const form = {
    tranid: 'website:nickname',
    Name: 'Родитель',
    contactMethod: 'vk',
    contactValue: 'https://vk.com/parent',
    childAge: '3 года',
    dataConsent: 'yes',
  };
  it('keeps original form details across retries and editing without relating all empty-phone leads', async () => {
    const { service, tx } = setup();
    const { dto, intakeDetails, externalKey } = tildaFields(form);
    const lead = await service.create(dto, null, externalKey, intakeDetails);
    expect(lead.phone).toBe('');
    expect(lead.intakeDetails).toMatchObject({
      childAge: '3 года',
      contactMethod: 'vk',
      dataConsent: true,
      marketingConsent: null,
    });
    const repeated = await service.create(
      dto,
      null,
      externalKey,
      intakeDetails,
    );
    expect(repeated.id).toBe(lead.id);
    expect(tx.crmLead.create).toHaveBeenCalledTimes(1);
    expect((await service.detail('lead')).relatedLeads).toEqual([]);
    expect(tx.crmLead.findMany).not.toHaveBeenCalled();
    const edited = await service.update(
      'lead',
      { ...dto, revision: 1, notes: 'Связались через VK' },
      { id: 'director', role: 'director' },
    );
    expect(edited.notes).toBe('Связались через VK');
    expect(edited.intakeDetails).toEqual(lead.intakeDetails);
  });
  it('requires a real phone before enrollment and still rejects blank manual contacts', async () => {
    const { service, admissions } = setup();
    const { dto, intakeDetails, externalKey } = tildaFields(form);
    await expect(
      service.create(dto, { id: 'admin', role: 'admin' }),
    ).rejects.toThrow();
    await service.create(dto, null, externalKey, intakeDetails);
    await expect(
      service.enroll(
        'lead',
        {
          groupId: 'group',
          startsOn: '2026-10-01',
          childName: 'Ребёнок',
          birthDate: '2022-01-01',
          revision: 1,
        },
        { id: 'director', role: 'director' },
      ),
    ).rejects.toThrow('Перед зачислением добавьте телефон');
    expect(admissions.enroll).not.toHaveBeenCalled();
  });
});
