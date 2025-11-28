import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { simpleParser } from 'mailparser';
import axios from 'axios';
import * as fs from 'fs/promises';
import { URL } from 'url';
import * as path from 'path';
import { extractLinks } from './helper/helper';

@Injectable()
export class EmailService {
  /**
   * Parse email and extract JSON from attachments and links
   */
  async parseEmailAndExtractJson(emailPathOrUrl: string): Promise<any> {
    // Read email content
    const emailContent = await this.readEmailContent(emailPathOrUrl);
    
    // Parse email
    const parsed = await simpleParser(emailContent);
    
    // Try to find JSON in attachments first
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const attachment of parsed.attachments) {
        if (attachment.filename && attachment.filename.endsWith('.json')) {
          try {
            const jsonContent = attachment.content.toString('utf-8');
            return JSON.parse(jsonContent);
          } catch (error) {
            continue;
          }
        }
      }
    }
   
    // Extract links from email 
    const links = extractLinks(parsed.textAsHtml || parsed.text || '');
    console.log(links)
    // Try to find JSON from links
    for (const link of links) {
      try {
        const json = await this.getJsonFromLink(link, 2); 
        if (json) {
          return json;
        }
      } catch (error) {
        // Continue to next link if this one fails
        continue;
      }
    }
    
    throw new BadRequestException('No JSON found in email attachments or links');
  }

  
  /**
   * Read email content from URL or local path
   */
  private async readEmailContent(path: string): Promise<Buffer> {
    if(/^(https?:\/\/)/i.test(path)) {
      return this.readFileFromUrlPath(path)
    } else {
      return this.readFileFromLocalPath(path)
    }
  }


  private async readFileFromUrlPath(fileUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get<ArrayBuffer>(fileUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        },
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new InternalServerErrorException('Unable to access to the URL file');
    }
  }


 
  private async readFileFromLocalPath(filePath: string): Promise<Buffer>  {
    try {
      const cleanFilePath = filePath.replace(/^["']|["']$/g, '');
      const fullPath = path.resolve(cleanFilePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      console.log(error)
      throw new InternalServerErrorException(
        `Failed to read email from path or URL: ${filePath}`,
      );
    }
  }


  /**
   * find JSON into links and nested links
   */
  private async getJsonFromLink(
    url: string,
    maxDepth: number,
  ): Promise<any | null> {
    if (maxDepth <= 0) {
      return null;
    }

    try {
      const response = await axios.get(url, {
        responseType: 'text',
        timeout: 10000,
      });

      const contentType = response.headers['content-type'] || '';
      
      // If the response is JSON, parse and return it
      if (contentType.includes('application/json')) {
        return JSON.parse(response.data);
      }

      // If the response is HTML/text
      const content = response.data;
      
      // Try to parse as JSON directly
      try {
        return JSON.parse(content);
      } catch {}

      // Look for JSON file links in the content
      const links = extractLinks(content);
      console.log({links})
      
      // Filter for JSON file links
      const jsonLinks = links.filter((link) => {
        try {
          // Resolve the URL whether is relative or absolute
          const linkUrl = new URL(link, url);
          return linkUrl.href.endsWith('.json');
        } catch (error) {
          return false;
        }
      });

      // Try to follow JSON links
      for (const jsonLink of jsonLinks) {
        try {
          return await this.getJsonFileFromLink(jsonLink,url, maxDepth)
        } catch (error) {
          continue;
        }
      }

      // Also check for any links that might lead to JSON (for nested scenarios)
      if (maxDepth > 1) {
        for (const link of links) {
          try {
            return await this.getJsonFileFromLink(link,url, maxDepth)
          } catch (error) {
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      throw new InternalServerErrorException('Could not get a json file')
    }
  }

  private async getJsonFileFromLink(jsonLink: string, url: string, maxDepth: number) {
    console.log({maxDepth})
    const resolvedUrl = new URL(jsonLink, url).href;
    const json = await this.getJsonFromLink(resolvedUrl, maxDepth - 1);
    if (!json) {
      throw new NotFoundException('Json was not found');
    }
    return json;
  }
}

