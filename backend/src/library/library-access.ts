export const canEditLibrary = (role: string) =>
  ['superadmin', 'director', 'methodist'].includes(role);
export function canReadDocument(
  document: {
    audience: string;
    published: boolean;
    authorId?: string;
    reviewStatus?: string;
  },
  role: string,
  userId?: string,
) {
  if (canEditLibrary(role)) return true;
  if (userId && role === 'teacher' && document.authorId === userId) return true;
  if (document.reviewStatus && document.reviewStatus !== 'approved')
    return false;
  if (!document.published) return false;
  return (
    document.audience === 'all' ||
    (document.audience === 'staff' && role !== 'parent') ||
    (document.audience === 'teachers' && role === 'teacher') ||
    (document.audience === 'parents' && role === 'parent') ||
    (document.audience === 'specialists' &&
      ['psychologist', 'pediatrician'].includes(role))
  );
}
