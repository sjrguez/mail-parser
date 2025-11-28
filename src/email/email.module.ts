import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './app.controller';

@Module({
  providers: [EmailService],
  controllers: [EmailController],
})
export class EmailModule {}


