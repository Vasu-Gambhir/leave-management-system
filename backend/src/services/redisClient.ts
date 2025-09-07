import { createClient, RedisClientType } from "redis";
import { config } from "../config/index.js";

class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (!config.REDIS_ENABLED) {
      return;
    }

    if (this.isConnected) {
      return;
    }

    try {
      this.client = createClient({
        url: config.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error("🔴 Redis: Max reconnection attempts reached");
              return new Error("Max reconnection attempts reached");
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on("error", (err) => {
        console.error("🔴 Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        this.isConnected = true;
      });

      this.client.on("reconnecting", () => {
        this.isConnected = false;
      });

      await this.client.connect();

      await this.client.ping();
    } catch (error) {
      console.error("🔴 Failed to connect to Redis:", error);
      this.client = null;
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export const redisClient = new RedisClient();
