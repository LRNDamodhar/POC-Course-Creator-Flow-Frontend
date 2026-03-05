/**
 * Course Schema Model
 *
 * Mirrors the exact JSON structure produced by the ai-course-creator backend.
 * Source of truth: src/enums/courseScriptPrompts.js → courseToJson function schema.
 *
 * Top-level structure:
 *   { lessons: Lesson[] }
 *
 * Each Lesson has:
 *   { title, pages: Page[] }
 *
 * Each Page has a `templateType` that determines which additional fields are present.
 */

// ─── Shared / Common ──────────────────────────────────────────────────────────

export interface PageBase {
  title: string;
  templateType: TemplateType;
  text?: string;                              // On-Screen Text (HTML)
  audioTranscript?: string;                   // Audio Narration (HTML)
  backgroundImageGraphicDescription?: string; // Image Description
  backgroundImageAltText?: string;            // Alternate Text
}

export type TemplateType =
  | 'textGraphic'
  | 'saq'
  | 'selectAndReveal'
  | 'consent'
  | 'selectAndRevealHotSpots'
  | 'video'
  | 'binaryList'
  | 'consult'
  | 'coreImage'
  | 'saqVideo'
  | 'popup'
  | 'podcast'
  | 'timeline'
  | 'slideShow'
  | 'quickQuiz';

// ─── textGraphic ──────────────────────────────────────────────────────────────

export interface TextGraphicPage extends PageBase {
  templateType: 'textGraphic';
  hasImageOnly?: boolean;
  contentGrid?: 'onecolumn' | 'twocolumn';
  pageCovered?: '50' | '70' | '100';
  textLayout?: 'left' | 'center' | 'right' | 'twoColumnBottom' | 'twoColumnTop';
  textBackground?: 'box' | 'gradient';
}

// ─── saq ─────────────────────────────────────────────────────────────────────

export interface SaqChoice {
  text: string;
  isCorrect: boolean;
  choiceLevelFeedbackTitle?: string;
  choiceLevelFeedbackSummary?: string;
}

export interface SaqQuestion {
  questionText: string;
  questionDescription?: string;
  choices: SaqChoice[];
  questionType: 'multipleChoice' | 'checkAll';
  foregroundImageToggle?: boolean;
  foregroundLayout?: 'left' | 'right';
  foreGroundImageAltText?: string;
  foreGroundImageGraphicDescription?: string;
}

export interface SaqPage extends PageBase {
  templateType: 'saq';
  question: SaqQuestion;
  feedbackType?: 'single' | 'multiple';
  feedbackSummary?: string;
  feedbackCorrectTitle?: string;
  feedbackCorrectSummary?: string;
  feedbackIncorrectTitle?: string;
  feedbackIncorrectSummary?: string;
  feedbackRetryTitle?: string;
  feedbackRetrySummary?: string;
  foregroundImageToggle?: boolean;
  foregroundLayout?: 'foregroundImgLeft' | 'foregroundImgRight';
  foreGroundImageAltText?: string;
  foreGroundImageGraphicDescription?: string;
  nasbaChoiceLevelFeedbackToggle?: boolean;
  retrySetting?: number;
}

// ─── selectAndReveal ──────────────────────────────────────────────────────────

export interface ClickAndRevealItem {
  click: string;
  reveal: string;
  backgroundImageGraphicDescription?: string;
  backgroundImageAltText?: string;
}

export interface SelectAndRevealPage extends PageBase {
  templateType: 'selectAndReveal';
  navigationalPrompt?: string;
  clickAndRevealItems: ClickAndRevealItem[];
  interactionToAppear: 'random' | 'locked';
  layoutInteractions?: 'tile' | 'accordion';
  textLayout?: 'left' | 'top' | 'right';
  foregroundLayout?: 'left' | 'right';
  foreGroundImageAltText?: string;
  foreGroundImageGraphicDescription?: string;
}

// ─── consent ─────────────────────────────────────────────────────────────────

export interface ConsentItem {
  text: string;
}

export interface ConsentPage extends PageBase {
  templateType: 'consent';
  consentChecklist: ConsentItem[];
}

// ─── selectAndRevealHotSpots ──────────────────────────────────────────────────

export interface HotspotItem {
  title: string;
  text: string;
  addImageToContent?: boolean;
  hotspotItemImageDescription?: string;
  hotspotItemImageAltText?: string;
}

export interface SelectAndRevealHotSpotsPage extends PageBase {
  templateType: 'selectAndRevealHotSpots';
  hotspotItems: HotspotItem[];
  unlockHotspotToggle?: boolean;
  unlockCount?: number;
  hotspotSelectionType?: 'sequential' | 'random';
  hotspotPosition?: 'random' | 'fixed';
  customizeIconToggle?: boolean;
  pageCovered?: '25' | '50' | '70';
  textLayout?: 'left' | 'center' | 'right';
  textBackground?: 'box' | 'gradient';
  foregroundImageToggle?: boolean;
  foregroundLayout?: 'left' | 'right';
  foreGroundImageAltText?: string;
  foreGroundImageGraphicDescription?: string;
}

// ─── video ────────────────────────────────────────────────────────────────────

export interface VideoPanel {
  text: string;
  panelImageDescription?: string;
  panelAltText?: string;
}

export interface VideoPage extends PageBase {
  templateType: 'video';
  videoPanels: VideoPanel[];
  isVideoScrubbing?: boolean;
  foregroundImageToggle?: boolean;
  foregroundLayout?: 'left' | 'right';
  foregroundImageAltText?: string;
  foregroundImageDescription?: string;
  foregroundImageGraphicDescription?: string;
}

// ─── binaryList ───────────────────────────────────────────────────────────────

export interface BinaryChoice {
  id: string; // "Choice 1", "Choice 2", …
  text: string;
}

export interface BinaryQuestion {
  text: string;
  correctChoiceId: string;
  imageIconDescription?: string;
  imageIconAltText?: string;
}

export interface BinaryListPage extends PageBase {
  templateType: 'binaryList';
  choices: BinaryChoice[];
  questions: BinaryQuestion[];
  questionHasImages: 'yes' | 'no';
  correctFeedbackTitle?: string;
  correctFeedbackSummary?: string;
  incorrectFeedbackTitle?: string;
  incorrectFeedbackSummary?: string;
  partialFeedbackTitle?: string;
  partialFeedbackSummary?: string;
  questionAppearOneAtTime?: 'yes' | 'no';
  pageCovered?: 'text-image' | 'text-only';
}

// ─── consult ─────────────────────────────────────────────────────────────────

export interface ConsultPanel {
  title: string;
  text: string;
  clickImageDescription: string;
  clickImageAltText: string;
}

export interface ConsultQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface ConsultPage extends PageBase {
  templateType: 'consult';
  consultPanels: ConsultPanel[];
  consultQuestionOptions: ConsultQuestionOption[];
  questionTitle: string;
  question: string;
  questionType: 'multipleChoice' | 'checkAll';
  retrySettings: number;
  feedbackType: 'single' | 'multiple';
  feedbackSummary?: string;
  feedbackCorrectTitle: string;
  feedbackCorrectSummary: string;
  feedbackIncorrectTitle: string;
  feedbackIncorrectSummary: string;
  feedbackRetryTitle: string;
  feedbackRetrySummary: string;
  showQuote?: boolean;
  textLayout?: 'classic' | 'combined';
  addImageToggle: boolean;
  contentImageDescription?: string;
  contentImageAltText?: string;
}

// ─── coreImage ────────────────────────────────────────────────────────────────

export interface CoreImagePage extends PageBase {
  templateType: 'coreImage';
  foregroundLayout?: 'left' | 'right';
  forgroundImageAppearance?: 'insideTheBox' | 'outsideTheBox';
  foreGroundImageAltText?: string;
  foreGroundImageGraphicDescription?: string;
}

// ─── saqVideo ─────────────────────────────────────────────────────────────────

export interface SaqVideoQuestion {
  questionType: 'multipleChoice' | 'checkAll';
  questionTitle: string;
  questionDescription: string;
  questionOptions: { isCorrect: boolean; text: string }[];
}

export interface SaqVideoPage extends PageBase {
  templateType: 'saqVideo';
  videoPanelTitle?: string;
  videoPanelText?: string;
  question: SaqVideoQuestion;
  feedbackType?: 'single' | 'multiple';
  partialFeedbackToggle?: boolean;
  partialFeedbackTitle?: string;
  partialFeedbackSummary?: string;
  feedbackSummary?: string;
  feedbackCorrectTitle?: string;
  feedbackCorrectSummary?: string;
  feedbackIncorrectTitle?: string;
  feedbackIncorrectSummary?: string;
  feedbackRetryTitle?: string;
  feedbackRetrySummary?: string;
  isVideoScrubbing?: boolean;
  pageVideoThumbnailEnabled: boolean;
  videoThumbnailDescription?: string;
  videoThumbnailAltText?: string;
  retrySetting?: number;
}

// ─── popup ────────────────────────────────────────────────────────────────────

export interface PopupItem {
  text: string;
  title: string;
  layout: 'left' | 'right' | 'center';
  foregroundImageAltText?: string;
  foregroundImageDescription?: string;
}

export interface PopupPage extends PageBase {
  templateType: 'popup';
  popupEnableQuotation: boolean;
  popupLabelInThumbnail: boolean;
  popupItems: PopupItem[];
  textLayout?: 'popupLeft' | 'popupTop' | 'popup2Column';
  foregroundImageToggle?: boolean;
  foregroundLayout?: 'left' | 'right';
  foreGroundImageAltText?: string;
  foreGroundImageGraphicDescription?: string;
}

// ─── podcast ─────────────────────────────────────────────────────────────────

export interface PodcastPage extends PageBase {
  templateType: 'podcast';
  isAudioTranscript?: boolean;
  isAudioScrubbing?: boolean;
  textLayout?: 'left' | 'center' | 'right';
}

// ─── timeline ─────────────────────────────────────────────────────────────────

export interface TimelineItem {
  timelineLabel: string;
  timelineTitle: string;
  timelineDescription: string;
  itemAudioTranscript: string;
  itemBoxLayout: 'boxOnly' | 'boxNumberInside' | 'boxNumberOutside' | 'boxImageInside' | 'boxImageOutside';
  itemLayoutPosition: 'left' | 'right';
  foregroundImageDescription?: string;
  foregroundImageAltText?: string;
  timelineCustomIcon?: boolean;
}

export interface TimelinePage extends PageBase {
  templateType: 'timeline';
  timelineItems: TimelineItem[];
  timelineAnimation?: 'slide' | 'zoom';
  timelineSliderBehaviour?: 'linear' | 'exploratory';
}

// ─── slideShow ────────────────────────────────────────────────────────────────

export interface Slide {
  slideTitle?: string;
  slideDescription?: string;
  slideAudioTranscript?: string;
  slideFormat?: 'text' | 'chat';
  slideChatSetting?: 'allAtOnce' | 'withDelay' | 'userInitiated';
  slideChatDelay?: number;
  slideChatLayout?: 'conversation' | 'messenger';
  slideImagelayout?: 'forgroundImage' | 'fullImage';
  slideForegroundImageLayout?: 'left' | 'right';
  slideForegroundImageDescription?: string;
  slideForegroundImageAltText?: string;
}

export interface SlideShowPage extends PageBase {
  templateType: 'slideShow';
  slides?: Slide[];
  personas?: { personaName: string; personaImageAltText?: string }[];
  sliderBehaviour?: 'linear' | 'exploratory';
  slideNavigation?: string;
}

// ─── quickQuiz ────────────────────────────────────────────────────────────────

export interface QuickQuizQuestion {
  adpQuestionText: string;
  adpQuestionType?: 'multipleChoice' | 'checkAll';
  feedbackDescription?: string;
  options?: { adpQuestionAnswer: string; adpQuestionValue: boolean }[];
}

export interface QuickQuizPage extends PageBase {
  templateType: 'quickQuiz';
  questionDetails?: QuickQuizQuestion[];
  numberOfTakeQuestions?: number;
  isQuestionPooling?: boolean;
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type CoursePage =
  | TextGraphicPage
  | SaqPage
  | SelectAndRevealPage
  | ConsentPage
  | SelectAndRevealHotSpotsPage
  | VideoPage
  | BinaryListPage
  | ConsultPage
  | CoreImagePage
  | SaqVideoPage
  | PopupPage
  | PodcastPage
  | TimelinePage
  | SlideShowPage
  | QuickQuizPage;

// ─── Lesson & Course ─────────────────────────────────────────────────────────

export interface CourseLesson {
  title: string;
  pages: CoursePage[];
  lessonType?: string; // e.g. "Test Out" when quickQuiz present
}

export interface CourseJson {
  lessons: CourseLesson[];
}

// ─── Template metadata for display ───────────────────────────────────────────

export interface TemplateInfo {
  label: string;
  icon: string;
  color: string;
}

export const TEMPLATE_INFO: Record<TemplateType, TemplateInfo> = {
  textGraphic:              { label: 'Text + Graphic',        icon: '🖼️',  color: '#4a90e2' },
  saq:                      { label: 'SAQ',                   icon: '❓',  color: '#e67e22' },
  selectAndReveal:          { label: 'Select & Reveal',        icon: '👆',  color: '#27ae60' },
  consent:                  { label: 'Consent',               icon: '✅',  color: '#8e44ad' },
  selectAndRevealHotSpots:  { label: 'Hotspots',              icon: '🎯',  color: '#c0392b' },
  video:                    { label: 'Video',                  icon: '🎬',  color: '#2c3e50' },
  binaryList:               { label: 'Binary List',           icon: '⚖️',  color: '#16a085' },
  consult:                  { label: 'Consult',               icon: '💬',  color: '#d35400' },
  coreImage:                { label: 'Core Image',            icon: '🖼️',  color: '#2980b9' },
  saqVideo:                 { label: 'SAQ Video',             icon: '🎥',  color: '#8e44ad' },
  popup:                    { label: 'Popup',                  icon: '🔔',  color: '#1abc9c' },
  podcast:                  { label: 'Podcast',               icon: '🎙️',  color: '#e74c3c' },
  timeline:                 { label: 'Timeline',              icon: '📅',  color: '#f39c12' },
  slideShow:                { label: 'Slideshow',             icon: '▶️',  color: '#6c5ce7' },
  quickQuiz:                { label: 'Quick Quiz',            icon: '🧠',  color: '#00b894' },
};
