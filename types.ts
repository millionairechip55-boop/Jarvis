
export type Sender = 'user' | 'bot';

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    // FIX: Adjusted placeAnswerSources to be an object instead of an array to align with SDK types.
    placeAnswerSources?: {
      reviewSnippets?: {
        text: string;
      }[];
    };
  };
}

export interface SimulatedFunctionCall {
  name: string;
  args: any;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  sources?: GroundingChunk[];
  image?: string; // To hold base64 image data
  actions?: SimulatedFunctionCall[]; // For displaying simulated device control actions
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}
