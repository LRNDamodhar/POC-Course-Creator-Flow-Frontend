# Angular Chat Application

A modern chat interface built with Angular 21, featuring a split-panel layout with chat list and preview components.

## Features

- ✨ **Chat Input Component**: Text area with send button for composing messages
- 📝 **Chat List Component**: Displays all messages with selection capability
- 👁️ **Chat Preview Component**: Shows detailed view of selected message
- 🎨 **Responsive Split Layout**: Input & list on left, preview on right
- 🔄 **Real-time State Management**: Using Angular Signals
- 📱 **Mobile Responsive**: Adapts to smaller screens

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── chat-input/         # Message input component
│   │   │   ├── chat-list/          # Messages list component
│   │   │   └── chat-preview/       # Message preview component
│   │   ├── services/
│   │   │   └── chat.ts             # Chat service with signals
│   │   ├── app.ts                  # Main app component
│   │   ├── app.html                # Main app template
│   │   └── app.css                 # Main app styles
│   └── styles.css                  # Global styles
```

## Components Overview

### Chat Service
- Manages chat state using Angular Signals
- Provides methods to add messages and select messages
- Interface: `ChatMessage` with id, content, timestamp, and sender

### Chat Input Component
- Textarea for message input
- Send button to submit messages
- Enter key support (Shift+Enter for new line)
- Auto-focus and clear after sending

### Chat List Component
- Displays all messages chronologically
- Shows sender name and timestamp
- Click to select and preview a message
- Visual indication for selected message
- Different styling for user vs assistant messages

### Chat Preview Component
- Shows detailed view of selected message
- Displays sender, timestamp, and message ID
- Full message content view
- Empty state when no message selected

## Running the Application

1. **Install dependencies** (if not already done):
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open in browser**:
   Navigate to http://localhost:4200/

## Usage

1. Type a message in the text area at the bottom of the left panel
2. Click "Send" or press Enter to send the message
3. Your message appears in the chat list
4. A simulated assistant response will appear after 500ms
5. Click any message in the list to view it in the preview panel on the right
6. The preview shows detailed information about the selected message

## Customization

### Styling
- **Global styles**: Edit `src/styles.css`
- **App layout**: Edit `src/app/app.css`
- **Component styles**: Edit individual component CSS files

### Message Storage
The current implementation stores messages in memory using Angular Signals. To add persistence:
- Implement local storage in the chat service
- Connect to a backend API
- Use IndexedDB for offline support

### Features to Add
- Message editing
- Message deletion
- User authentication
- Real-time chat with WebSocket
- Message search/filter
- File attachments
- Emoji support
- Message reactions

## Technologies

- **Angular 21**: Latest Angular framework with standalone components
- **TypeScript**: Type-safe JavaScript
- **Angular Signals**: Reactive state management
- **CSS3**: Modern styling with flexbox
- **RxJS**: Reactive programming (available if needed)

## Development

- **Add new component**: `npx ng generate component components/component-name`
- **Add new service**: `npx ng generate service services/service-name`
- **Build for production**: `npm run build`
- **Run tests**: `npm test`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

**Created**: January 2026
**Framework**: Angular 21.1.0
