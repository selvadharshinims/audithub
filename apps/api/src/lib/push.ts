import { logger } from "./logger.js";

export interface Push {
  send(userId: string, payload: { title: string; body?: string; link?: string }): Promise<void>;
}

class ConsolePush implements Push {
  async send(userId: string, payload: { title: string; body?: string; link?: string }) {
    logger.info({ userId, payload }, "push.send (stub)");
  }
}

export const push: Push = new ConsolePush();
