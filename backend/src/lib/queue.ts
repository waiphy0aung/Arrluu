import { Queue, QueueEvents, Worker, Job } from "bullmq";
import { createQueueConnection } from "./redis";
import cloudinary from "./cloudinary";
import Message from "../models/message.model";
import { getReceiverSocketId, io } from "./socket";
import logger from "./logger";

// Queue configuration
const QUEUE_CONFIG = {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },
  connection: createQueueConnection(),
};

// Worker configuration
const WORKER_CONFIG = {
  connection: createQueueConnection(),
  concurrency: 5,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// Types
interface MessageJobData {
  senderId: string;
  receiverId: string;
  body: {
    text?: string;
    image?: string | null;
    iv: string;
    receiverEncryptedKey: string;
    senderEncryptedKey: string;
  };
}

interface ProcessedMessage {
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string | null;
  iv: string;
  receiverEncryptedKey: string;
  senderEncryptedKey: string;
  imageUrl?: string;
}

class MessageQueueManager {
  private static instance: MessageQueueManager;
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;

  private constructor() {
    this.queue = new Queue('messageQueue', QUEUE_CONFIG);
    this.queueEvents = new QueueEvents('messageQueue', {
      connection: createQueueConnection()
    });
    this.worker = new Worker('messageQueue', this.processMessage.bind(this), WORKER_CONFIG);

    this.setupEventHandlers();
  }

  public static getInstance(): MessageQueueManager {
    if (!MessageQueueManager.instance) {
      MessageQueueManager.instance = new MessageQueueManager();
    }
    return MessageQueueManager.instance;
  }

  private setupEventHandlers(): void {
    // Worker events
    this.worker.on('completed', (job: Job) => {
      logger.info(`Message job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error(`Message job ${job?.id} failed`, {
        jobId: job?.id,
        error: err.message,
        data: job?.data
      });
    });

    this.worker.on('error', (err: Error) => {
      logger.error('Worker error occurred', err.message);
    });

    // Queue events
    this.queueEvents.on('completed', ({ jobId }) => {
      logger.info(`Job ${jobId} completed`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${jobId} failed: ${failedReason}`);
    });
  }

  private async processMessage(job: Job<MessageJobData>): Promise<any> {
    const { senderId, receiverId, body } = job.data;

    try {
      // Process image if present
      let imageUrl: string | null = null;
      if (body.image) {
        const uploadResponse = await this.uploadImage(body.image);
        imageUrl = uploadResponse.secure_url;
      }

      // Create message
      const messageData: ProcessedMessage = {
        senderId,
        receiverId,
        ...body,
        image: imageUrl,
      };

      const newMessage = await this.saveMessage(messageData);

      // Emit to receiver if online
      this.emitToReceiver(receiverId, newMessage);

      return newMessage;
    } catch (error) {
      logger.error('Message processing failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        senderId,
        receiverId
      });
      throw error;
    }
  }

  private async uploadImage(image: string): Promise<any> {
    return await cloudinary.uploader.upload(image, {
      folder: 'chat-app/messages',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'auto' }
      ]
    });
  }

  private async saveMessage(messageData: ProcessedMessage): Promise<any> {
    const newMessage = new Message(messageData);
    await newMessage.save();
    return newMessage;
  }

  private emitToReceiver(receiverId: string, message: any): void {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
      logger.info(`Message emitted to receiver ${receiverId}`);
    }
  }

  // Public methods
  public async addMessage(jobData: MessageJobData): Promise<Job> {
    return await this.queue.add('sendMessage', jobData, {
      priority: 1,
      delay: 0,
    });
  }

  public async waitForCompletion(job: Job): Promise<any> {
    return await job.waitUntilFinished(this.queueEvents);
  }

  public async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  public async pause(): Promise<void> {
    await this.queue.pause();
    await this.worker.pause();
    logger.info('Message queue paused');
  }

  public async resume(): Promise<void> {
    await this.queue.resume();
    await this.worker.resume();
    logger.info('Message queue resumed');
  }

  public async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    logger.info('Message queue closed');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const stats = await this.getQueueStats();
      const isWorkerRunning = await this.worker.isRunning();
      return isWorkerRunning && stats !== null;
    } catch {
      return false;
    }
  }

  // Getters for backward compatibility
  public getQueue(): Queue {
    return this.queue;
  }

  public getWorker(): Worker {
    return this.worker;
  }

  public getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }
}

// Export singleton instance
const messageQueueManager = MessageQueueManager.getInstance();

export const messageQueue = messageQueueManager.getQueue();
export const messageWorker = messageQueueManager.getWorker();
export const queueEvents = messageQueueManager.getQueueEvents();
export { messageQueueManager };
