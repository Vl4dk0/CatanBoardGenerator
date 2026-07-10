import { useRef, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchBoard } from "../api/boardApi";
import { type GeneratedBoard } from "../logic/catanLogic";

// Boards now come precomputed from the backend, so the client only needs a
// small prefetch buffer to keep the "Next Board" button feeling instant.
const MAX_QUEUE_SIZE = 3;
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

  // Load persisted queue on mount (instant first board across reloads).
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedQueue = JSON.parse(stored) as GeneratedBoard[];
          queueRef.current = parsedQueue;
          setQueueSize(parsedQueue.length);
        }
      } catch (error) {
        console.warn("Failed to load queue from storage:", error);
      } finally {
        isInitialized.current = true;
      }
    };

    loadQueue();
  }, []);

  // Persist queue to storage whenever it changes.
  const persistQueue = useCallback(async (queue: GeneratedBoard[]) => {
    if (!isInitialized.current) return;

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.warn("Failed to persist queue to storage:", error);
    }
  }, []);

  const prefetchAndEnqueue = useCallback(async () => {
    // Prevent multiple simultaneous prefetch loops.
    if (isGeneratingRef.current) {
      return;
    }

    isGeneratingRef.current = true;
    generationControlRef.current.shouldStop = false;

    while (
      queueRef.current.length < MAX_QUEUE_SIZE &&
      !generationControlRef.current.shouldStop
    ) {
      setIsGenerating(true);

      try {
        const newBoard = await fetchBoard();
        if (!generationControlRef.current.shouldStop) {
          queueRef.current.push(newBoard);
          setQueueSize(queueRef.current.length);
          await persistQueue(queueRef.current);
        }
      } catch (error) {
        // Backend unreachable: stop prefetching rather than spin. The direct
        // fetch path in the screen surfaces the error to the user.
        console.warn("Background prefetch failed:", error);
        break;
      }
    }

    setIsGenerating(false);
    isGeneratingRef.current = false;
  }, [persistQueue]);

  const getNextBoard = useCallback(() => {
    const board = queueRef.current.shift() || null;
    setQueueSize(queueRef.current.length);
    persistQueue(queueRef.current);
    return board;
  }, [persistQueue]);

  const startBackgroundGeneration = useCallback(() => {
    if (queueRef.current.length < MAX_QUEUE_SIZE && !isGeneratingRef.current) {
      prefetchAndEnqueue();
    }
  }, [prefetchAndEnqueue]);

  const stopBackgroundGeneration = useCallback(() => {
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
