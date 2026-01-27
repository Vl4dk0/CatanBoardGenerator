import { useRef, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  generateCatanBoardAsync,
  type GeneratedBoard,
} from "../logic/catanLogic";

const MAX_QUEUE_SIZE = 5;
const STORAGE_KEY = "@catan_board_queue";

export interface UseBoardQueueReturn {
  getNextBoard: () => GeneratedBoard | null;
  queueSize: number;
  isGenerating: boolean;
  startBackgroundGeneration: () => void;
  stopBackgroundGeneration: () => void;
}

export function useBoardQueue(): UseBoardQueueReturn {
  const queueRef = useRef<GeneratedBoard[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationControlRef = useRef<{ shouldStop: boolean }>({
    shouldStop: false,
  });
  const isGeneratingRef = useRef(false);
  const isInitialized = useRef(false);

  // Load persisted queue on mount
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedQueue = JSON.parse(stored) as GeneratedBoard[];
          queueRef.current = parsedQueue;
          setQueueSize(parsedQueue.length);
          console.log(`Loaded ${parsedQueue.length} boards from storage`);
        }
      } catch (error) {
        console.warn("Failed to load queue from storage:", error);
      } finally {
        isInitialized.current = true;
      }
    };

    loadQueue();
  }, []);

  // Persist queue to storage whenever it changes
  const persistQueue = useCallback(async (queue: GeneratedBoard[]) => {
    if (!isInitialized.current) return;

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      console.log(`Persisted ${queue.length} boards to storage`);
    } catch (error) {
      console.warn("Failed to persist queue to storage:", error);
    }
  }, []);

  const generateAndEnqueue = useCallback(async () => {
    // Prevent multiple simultaneous generation loops
    if (isGeneratingRef.current) {
      console.log("Background generation already running, skipping...");
      return;
    }

    isGeneratingRef.current = true;
    generationControlRef.current.shouldStop = false;

    console.log(
      `Starting background generation (current queue: ${queueRef.current.length}/${MAX_QUEUE_SIZE})`,
    );

    while (
      queueRef.current.length < MAX_QUEUE_SIZE &&
      !generationControlRef.current.shouldStop
    ) {
      setIsGenerating(true);

      const startTime = Date.now();
      const newBoard = await generateCatanBoardAsync();
      const endTime = Date.now();

      if (newBoard && !generationControlRef.current.shouldStop) {
        queueRef.current.push(newBoard);
        setQueueSize(queueRef.current.length);
        await persistQueue(queueRef.current);
        console.log(
          `Background generated board in ${endTime - startTime}ms (queue: ${queueRef.current.length}/${MAX_QUEUE_SIZE})`,
        );
      } else if (!newBoard) {
        console.warn("Background generation failed to create a board");
      }
    }

    setIsGenerating(false);
    isGeneratingRef.current = false;

    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      console.log(
        `Queue full (${queueRef.current.length}/${MAX_QUEUE_SIZE}), stopping background generation`,
      );
    }
  }, [persistQueue]);

  const getNextBoard = useCallback(() => {
    const board = queueRef.current.shift() || null;
    setQueueSize(queueRef.current.length);
    persistQueue(queueRef.current);

    if (board) {
      console.log(
        `Popped board from queue (remaining: ${queueRef.current.length}/${MAX_QUEUE_SIZE})`,
      );
    }

    return board;
  }, [persistQueue]);

  const startBackgroundGeneration = useCallback(() => {
    if (queueRef.current.length < MAX_QUEUE_SIZE && !isGeneratingRef.current) {
      console.log("Triggering background generation...");
      generateAndEnqueue();
    } else {
      console.log(
        `Skipping background generation (queue: ${queueRef.current.length}/${MAX_QUEUE_SIZE}, generating: ${isGeneratingRef.current})`,
      );
    }
  }, [generateAndEnqueue]);

  const stopBackgroundGeneration = useCallback(() => {
    console.log("Stopping background generation...");
    generationControlRef.current.shouldStop = true;
  }, []);

  return {
    getNextBoard,
    queueSize,
    isGenerating,
    startBackgroundGeneration,
    stopBackgroundGeneration,
  };
}
