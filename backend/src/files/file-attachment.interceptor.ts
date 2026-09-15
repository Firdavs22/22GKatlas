import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FileAccessService } from './file-access.service';

@Injectable()
export class FileAttachmentInterceptor implements NestInterceptor {
  constructor(private access: FileAccessService) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      if (req.user && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        await this.access.assertCanAttach(req.body, req.user);
      }
    }
    return next.handle();
  }
}
