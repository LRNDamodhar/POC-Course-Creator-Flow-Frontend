import { Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseOutlineData, ModuleData, LessonData, Chat } from '../../services/chat';

@Component({
  selector: 'app-course-outline-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-outline-preview.html',
  styleUrl: './course-outline-preview.css',
})
export class CourseOutlinePreview implements OnInit {
  @Input() outline!: CourseOutlineData | null;
  @Input() showOnlyAccepted: boolean = false; // New input to control filtering
  
  expandedModules = signal<Set<number>>(new Set());
  expandedTemplates = signal<Set<string>>(new Set()); // Track expanded templates by lesson key
  expandedJsons = signal<Set<string>>(new Set()); // Track expanded JSON viewers by lesson key
  
  // Dialog state
  isTemplateDialogOpen = signal<boolean>(false);
  selectedTemplateLesson = signal<LessonData | null>(null);
  showTechnicalDetails = signal<boolean>(false);
  copyButtonText = signal<string>('Copy');

  constructor(private chatService: Chat) {}

  ngOnInit() {
    console.log('[CourseOutlinePreview] Outline data:', this.outline);
    console.log('[CourseOutlinePreview] Modules:', this.outline?.modules);
    if (this.outline?.modules) {
      // Expand all modules by default
      const allModuleNumbers = this.outline.modules.map(m => m.moduleNumber);
      this.expandedModules.set(new Set(allModuleNumbers));
      
      this.outline.modules.forEach((module, index) => {
        console.log(`[CourseOutlinePreview] Module ${index}:`, {
          moduleNumber: module.moduleNumber,
          title: module.title,
          description: module.description,
          lessonsCount: module.lessonsCount
        });
      });
    }
  }

  toggleModule(moduleNumber: number) {
    const current = this.expandedModules();
    const newSet = new Set(current);
    if (newSet.has(moduleNumber)) {
      newSet.delete(moduleNumber);
    } else {
      newSet.add(moduleNumber);
    }
    this.expandedModules.set(newSet);
  }

  isModuleExpanded(moduleNumber: number): boolean {
    return this.expandedModules().has(moduleNumber);
  }

  // Helper to update the message in chat service
  private updateCourseOutline() {
    const selectedMsg = this.chatService.selectedMessage();
    console.log('[CourseOutlinePreview] updateCourseOutline - selectedMsg:', selectedMsg?.id);
    console.log('[CourseOutlinePreview] Current outline:', this.outline);
    
    if (selectedMsg && selectedMsg.courseOutline && this.outline) {
      // Create a deep copy to ensure change detection works
      const updatedOutline = JSON.parse(JSON.stringify(this.outline));
      
      // Update in UI
      this.chatService.updateMessageCourseOutline(selectedMsg.id, updatedOutline);
      console.log('[CourseOutlinePreview] Called updateMessageCourseOutline with deep copy');
      
      // Update in database
      this.chatService.updateCourseOutlineStatusInDB(selectedMsg.id, updatedOutline);
      console.log('[CourseOutlinePreview] Called updateCourseOutlineStatusInDB');
    } else {
      console.log('[CourseOutlinePreview] No selectedMsg or courseOutline to update');
    }
  }

  // Module actions
  acceptModule(module: ModuleData, event: Event) {
    event.stopPropagation();
    module.accepted = true;
    // Accept all lessons in this module
    module.lessons.forEach(lesson => lesson.accepted = true);
    this.updateCourseOutline();
    console.log(`Module ${module.moduleNumber} accepted:`, module.title);
  }

  rejectModule(module: ModuleData, event: Event) {
    event.stopPropagation();
    module.accepted = false;
    // Reject all lessons in this module
    module.lessons.forEach(lesson => lesson.accepted = false);
    this.updateCourseOutline();
    console.log(`Module ${module.moduleNumber} rejected:`, module.title);
  }

  resetModuleStatus(module: ModuleData, event: Event) {
    event.stopPropagation();
    module.accepted = undefined;
    // Reset all lessons in this module
    module.lessons.forEach(lesson => lesson.accepted = undefined);
    this.updateCourseOutline();
    console.log(`Module ${module.moduleNumber} reset to pending:`, module.title);
  }

  // Lesson actions
  acceptLesson(lesson: LessonData, event: Event) {
    event.stopPropagation();
    lesson.accepted = true;
    this.updateCourseOutline();
    console.log(`Lesson ${lesson.lessonNumber} accepted:`, lesson.title);
  }

  rejectLesson(lesson: LessonData, event: Event) {
    event.stopPropagation();
    lesson.accepted = false;
    this.updateCourseOutline();
    console.log(`Lesson ${lesson.lessonNumber} rejected:`, lesson.title);
  }

  resetLessonStatus(lesson: LessonData, event: Event) {
    event.stopPropagation();
    lesson.accepted = undefined;
    this.updateCourseOutline();
    console.log(`Lesson ${lesson.lessonNumber} reset to pending:`, lesson.title);
  }

  // Summary calculations
  getAcceptedModulesCount(): number {
    if (!this.outline?.modules) return 0;
    return this.outline.modules.filter((m: ModuleData) => m.accepted === true).length;
  }

  getRejectedModulesCount(): number {
    if (!this.outline?.modules) return 0;
    return this.outline.modules.filter((m: ModuleData) => m.accepted === false).length;
  }

  getAcceptedLessonsCount(): number {
    if (!this.outline?.modules) return 0;
    let count = 0;
    this.outline.modules.forEach(module => {
      count += module.lessons.filter((l: LessonData) => l.accepted === true).length;
    });
    return count;
  }

  getRejectedLessonsCount(): number {
    if (!this.outline?.modules) return 0;
    let count = 0;
    this.outline.modules.forEach(module => {
      count += module.lessons.filter((l: LessonData) => l.accepted === false).length;
    });
    return count;
  }

  // Get count of lessons with templates
  getLessonsWithTemplatesCount(): number {
    if (!this.outline?.modules) return 0;
    let count = 0;
    this.outline.modules.forEach(module => {
      count += module.lessons.filter((l: LessonData) => l.template).length;
    });
    return count;
  }

  // Get filtered modules (only accepted if showOnlyAccepted is true)
  getFilteredModules(): ModuleData[] {
    if (!this.outline?.modules) return [];
    if (!this.showOnlyAccepted) return this.outline.modules;
    return this.outline.modules.filter(m => m.accepted === true);
  }

  // Get filtered lessons for a module (only accepted if showOnlyAccepted is true)
  getFilteredLessons(module: ModuleData): LessonData[] {
    if (!module.lessons) return [];
    if (!this.showOnlyAccepted) return module.lessons;
    return module.lessons.filter(l => l.accepted === true);
  }

  // Template expansion methods
  getLessonKey(lesson: LessonData): string {
    return `${lesson.lessonNumber}-${lesson.title}`;
  }

  toggleTemplateExpansion(lesson: LessonData): void {
    const key = this.getLessonKey(lesson);
    const current = this.expandedTemplates();
    const newSet = new Set(current);
    
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    
    this.expandedTemplates.set(newSet);
    console.log('[CourseOutlinePreview] Template expansion toggled for:', lesson.title, 'Expanded:', newSet.has(key));
  }

  isTemplateExpanded(lesson: LessonData): boolean {
    const key = this.getLessonKey(lesson);
    return this.expandedTemplates().has(key);
  }

  // Format date for display
  formatDate(date: any): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      console.error('[CourseOutlinePreview] Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  // JSON viewer methods
  toggleJsonExpansion(lesson: LessonData): void {
    const key = this.getLessonKey(lesson);
    const current = this.expandedJsons();
    const newSet = new Set(current);
    
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    
    this.expandedJsons.set(newSet);
    console.log('[CourseOutlinePreview] JSON expansion toggled for:', lesson.title, 'Expanded:', newSet.has(key));
  }

  isJsonExpanded(lesson: LessonData): boolean {
    const key = this.getLessonKey(lesson);
    return this.expandedJsons().has(key);
  }

  formatJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      console.error('[CourseOutlinePreview] Error formatting JSON:', error);
      return 'Error formatting JSON';
    }
  }

  // Get template tooltip with display name and technical name
  getTemplateTooltip(template: any): string {
    if (!template) return '';
    
    const displayName = template.displayName || template.templateName;
    const technicalName = template.templateName;
    const type = template.templateType || template.category;
    
    if (template.displayName && displayName !== technicalName) {
      return `${displayName} (${technicalName}) - ${type}`;
    }
    
    return `${displayName} - ${type}`;
  }

  // Dialog methods
  openTemplateDialog(lesson: LessonData, event: Event): void {
    event.stopPropagation();
    console.log('[CourseOutlinePreview] Opening template dialog for lesson:', lesson.title);
    this.selectedTemplateLesson.set(lesson);
    this.isTemplateDialogOpen.set(true);
    this.showTechnicalDetails.set(false);
    this.copyButtonText.set('Copy');
  }

  closeTemplateDialog(): void {
    console.log('[CourseOutlinePreview] Closing template dialog');
    this.isTemplateDialogOpen.set(false);
    this.selectedTemplateLesson.set(null);
    this.showTechnicalDetails.set(false);
  }

  toggleTechnicalDetails(): void {
    this.showTechnicalDetails.set(!this.showTechnicalDetails());
  }

  copyTemplateJson(): void {
    const lesson = this.selectedTemplateLesson();
    if (!lesson?.template?.templateJson) return;

    const jsonString = this.formatJson(lesson.template.templateJson);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      console.log('[CourseOutlinePreview] Template JSON copied to clipboard');
      this.copyButtonText.set('Copied!');
      setTimeout(() => {
        this.copyButtonText.set('Copy');
      }, 2000);
    }).catch(err => {
      console.error('[CourseOutlinePreview] Failed to copy JSON:', err);
      this.copyButtonText.set('Failed');
      setTimeout(() => {
        this.copyButtonText.set('Copy');
      }, 2000);
    });
  }
}
