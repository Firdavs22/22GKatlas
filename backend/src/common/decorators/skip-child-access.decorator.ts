import { SetMetadata } from '@nestjs/common';

export const SKIP_CHILD_ACCESS_KEY = 'skipChildAccess';
export const SkipChildAccess = () => SetMetadata(SKIP_CHILD_ACCESS_KEY, true);
