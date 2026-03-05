import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TEMPLATE_INFO, TemplateType } from '../../models/course-schema.model';

@Component({
  selector: 'app-course-data-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-data-preview.html',
  styleUrl: './course-data-preview.css',
})
export class CourseDataPreview {
  @Input() courseData: any;

  expandedLessons: Set<number> = new Set();
  expandedPages: Set<string> = new Set();

  /** Total page count across all lessons */
  getTotalPages(): number {
    if (!this.courseData?.lessons) return 0;
    return this.courseData.lessons.reduce((total: number, lesson: any) => {
      return total + (lesson.pages?.length || 0);
    }, 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }

  toggleLesson(index: number): void {
    if (this.expandedLessons.has(index)) {
      this.expandedLessons.delete(index);
    } else {
      this.expandedLessons.add(index);
    }
  }

  togglePage(lessonIndex: number, pageIndex: number): void {
    const key = `${lessonIndex}-${pageIndex}`;
    if (this.expandedPages.has(key)) {
      this.expandedPages.delete(key);
    } else {
      this.expandedPages.add(key);
    }
  }

  isPageExpanded(lessonIndex: number, pageIndex: number): boolean {
    return this.expandedPages.has(`${lessonIndex}-${pageIndex}`);
  }

  /** Returns the human-readable label for a template type */
  getTemplateLabel(templateType: string): string {
    return TEMPLATE_INFO[templateType as TemplateType]?.label ?? templateType ?? 'Unknown';
  }

  /** Returns the emoji icon for a template type */
  getTemplateIcon(templateType: string): string {
    return TEMPLATE_INFO[templateType as TemplateType]?.icon ?? '📄';
  }

  /** Returns the background color for the template badge */
  getTemplateColor(templateType: string): string {
    return TEMPLATE_INFO[templateType as TemplateType]?.color ?? '#6c757d';
  }

  /** Converts a 0-based index to A, B, C … Z */
  getChoiceLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
