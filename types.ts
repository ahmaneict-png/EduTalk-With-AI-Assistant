
export enum ConversationStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  THINKING = 'THINKING',
  ERROR = 'ERROR',
}

export interface TranscriptionEntry {
  speaker: 'user' | 'model';
  text: string;
}