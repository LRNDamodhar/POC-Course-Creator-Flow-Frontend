import { Component, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PredefinedPrompt {
  id: string;
  title: string;
  prompt: string;
  icon: string;
  category: 'beginner' | 'intermediate' | 'advanced';
}

@Component({
  selector: 'app-predefined-prompts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predefined-prompts.html',
  styleUrls: ['./predefined-prompts.css']
})
export class PredefinedPromptsComponent {
  // Output event when a prompt is selected
  promptSelected = output<string>();
  
  // Input for loading state
  isGenerating = input<boolean>(false);
  
  // Track if prompts section is expanded
  isExpanded = signal(true);
  
  // Predefined prompts
  prompts = signal<PredefinedPrompt[]>([
    {
      id: 'anti-bribery',
      title: 'Anti-Bribery & Corruption',
      prompt: 'Create a 2-lesson course on Anti-Bribery and Corruption',
      icon: '⚖️',
      category: 'beginner'
    },
    {
      id: 'harassment',
      title: 'Harassment Prevention',
      prompt: 'Create a 10-lesson course on Workplace Harassment Prevention',
      icon: '🛡️',
      category: 'beginner'
    }
  ]);

  toggleExpanded() {
    this.isExpanded.update(value => !value);
  }

  selectPrompt(prompt: PredefinedPrompt) {
    this.promptSelected.emit(prompt.prompt);
  }

  getCategoryClass(category: string): string {
    return `category-${category}`;
  }
}
