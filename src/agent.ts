
import { Message, Settings, Agent } from './types';
import * as client from './client'

export class ChatGPTAgent implements Agent {
    private settings: Settings;
    private model: string;

    public constructor(settings: Settings, model: string) {
        this.settings = settings;
        this.model = model
    }
  
    async replay(msgs: Message[]): Promise<string> {
        let settings = this.settings;
        let model = this.model;

        let content = await client.replay(
            settings.openaiKey,
            settings.apiHost,
            settings.maxContextSize,
            settings.maxTokens,
            model,
            msgs
        )

        return content
    }
  }