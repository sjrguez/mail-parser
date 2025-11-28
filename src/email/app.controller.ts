import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('mail')
@Controller('mail')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}



  @Get('parse-email')
  @ApiOperation({
    summary:
      'Parse an email and return the JSON found as an attachment or as links.',
  })
  @ApiQuery({
    name: 'path',
    description: 'Local path or URL of the email (.eml) file.',
    required: true,
    example: '"C:\Users\sj\Downloads\Json url.eml"',
  })
  @ApiResponse({
    status: 200,
    description: 'JSON extracted from the email.',
  })
  @ApiResponse({
    status: 400,
    description: 'The path parameter is invalid or missing.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal error while processing the email.',
  })
  async parseEmail(@Query('path') path: string) {
    if (!path) {
      throw new BadRequestException('Email file path or URL is required');
    }

    const json = await this.emailService.parseEmailAndExtractJson(path);
    return json;
  }
}
