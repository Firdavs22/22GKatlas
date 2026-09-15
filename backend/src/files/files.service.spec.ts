import { FilesService } from './files.service';
import sharp from 'sharp';

describe('Uploaded file content', () => {
  it('preserves child document scans and immediately marks them as restricted files', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const service = new FilesService({ fileMeta: { upsert } } as any);
    const put = jest.spyOn(service as any, 'putObject').mockResolvedValue(undefined);
    const original = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
    const result = await service.uploadFile({ originalname: 'scan.png', mimetype: 'image/png', buffer: original } as any, 'parent', 'child');
    expect(result.url).toMatch(/\.png$/);
    expect(result.previewUrl).toBeUndefined();
    expect(put).toHaveBeenCalledWith(expect.any(String), original, 'image/png');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ scope: 'child-document', childId: 'child', uploaderId: 'parent' }) }));
  });
  it('rasterizes SVG so uploaded scripts cannot be served as active SVG', async () => {
    const prisma = { fileMeta: { upsert: jest.fn().mockResolvedValue({}) } };
    const service = new FilesService(prisma as any);
    const stored: Buffer[] = [];
    jest.spyOn(service as any, 'putObject').mockImplementation(async (_name, bytes) => { stored.push(bytes as Buffer); });
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script><rect width="10" height="10" fill="red"/></svg>');
    const result = await service.uploadFile({ originalname: 'active.svg', mimetype: 'image/svg+xml', buffer: svg } as any, 'uploader');
    expect(result.url).toMatch(/\.png$/);
    expect(result.previewUrl).toMatch(/_preview\.jpg$/);
    expect(stored).toHaveLength(2);
    expect((await sharp(stored[0]).metadata()).format).toBe('png');
    expect((await sharp(stored[1]).metadata()).format).toBe('jpeg');
  });
  it('does not use a supplied SVG extension for a PDF document', async () => {
    const service = new FilesService({ fileMeta: { upsert: jest.fn() } } as any);
    jest.spyOn(service as any, 'putObject').mockResolvedValue(undefined);
    const result = await service.uploadFile({ originalname: 'misleading.svg', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4') } as any, 'uploader');
    expect(result.url).toMatch(/\.pdf$/);
  });
});
