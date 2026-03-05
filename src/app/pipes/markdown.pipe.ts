import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    // Configure marked options for better formatting
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  transform(value: string): SafeHtml {
    if (!value) return '';
    
    try {
      // Parse markdown to HTML
      const parsed = marked.parse(value);
      const html = typeof parsed === 'string' ? parsed : parsed.toString();
      
      // Bypass security and trust the HTML
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Return the original value if parsing fails
      return this.sanitizer.bypassSecurityTrustHtml(value.replace(/\n/g, '<br>'));
    }
  }
}
