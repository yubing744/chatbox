import { Message, createMessage, Plugin, Agent, OpenAIRoleEnum } from './types';
import * as prompts from './prompts';

export interface QueryResult {
  results: Array<{
    query: string;
    results: Array<{
      id: string;
      text: string;
      metadata: {
        source: string;
        source_id: string;
        url: string;
        created_at: string;
        author: string;
        document_id: string;
      };
      embedding: number[];
      score: number;
    }>;
  }>;
}

export async function applyPlugins(
  agent: Agent,
  plugins: Plugin[],
  promptMsgs: Message[],
): Promise<Message> {
  let pluginMsg = createMessage(OpenAIRoleEnum.System, "")
  pluginMsg.tags = ["plugin_content"]

  console.log("applyPlugins:", plugins)

  let question = await summayQuestion(agent, promptMsgs)
  console.log("summay question:", question)

  let plugin = await selectPlugin(agent, plugins, question)
  console.log("select plugin:", plugin)

  if (plugin) {
    let content = await applyPlugin(agent, plugin, question)
    if (content) {
      pluginMsg.content = `可以参考插件获取的如下内容回复用户问题，内容如下：${content}`
    } else {
      pluginMsg.content = "插件没有相关信息"
    }
  } else {
    pluginMsg.content = "没有相关的插件"
  }

  console.log("pluginMsg:", pluginMsg)

  return pluginMsg
}

export async function summayQuestion(
  agent: Agent,
  msgs: Message[],
): Promise<string> {
  let promptMsgs = prompts.summayQuestion(msgs)
  console.log("promptMsgs:", promptMsgs)

  let summay = await agent.replay(promptMsgs)
  return summay
}

export async function selectPlugin(
  agent: Agent,
  plugins: Plugin[],
  question: string
): Promise<Plugin | null> {
  if (plugins && plugins.length > 0) {
    return plugins[0]
  }

  return null
}

export async function applyPlugin(
  agent: Agent,
  plugin: Plugin,
  text: string
): Promise<string> {
  try {
    const response = await fetch(`${plugin.api.url}/sub/query`, {
      method: 'POST',
      headers: {
        'Authorization': `${plugin.auth.authorization_type} ${plugin.auth.authorization_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "queries": [
          {
            "query": text,
            "top_k": 5
          }
        ]
      }),
    });

    if (!response.body) {
      throw new Error('No response body')
    }

    let msgContent = '';

    const result = await response.json() as QueryResult
    console.log("applyPlugin result:", result)

    if (result && result.results) {
      for (let chunk of result.results[0].results) {
        msgContent += chunk.text + "\n"
      }
    }

    return msgContent
  } catch (error) {
    throw error
  }
}
