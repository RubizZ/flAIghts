export class PriorityQueue<T> {
    private heap: { item: T; priority: number }[] = [];

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    enqueue(item: T, priority: number): void {
        this.heap.push({ item, priority });
        this.bubbleUp();
    }

    dequeue(): T | undefined {
        if (this.isEmpty()) return undefined;

        const min = this.heap[0]!.item;
        const end = this.heap.pop()!;

        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown();
        }

        return min;
    }

    private bubbleUp(): void {
        let idx = this.heap.length - 1;

        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            if (this.heap[idx]!.priority >= this.heap[parentIdx]!.priority) break;
            [this.heap[idx]!, this.heap[parentIdx]!] = [this.heap[parentIdx]!, this.heap[idx]!];
            idx = parentIdx;
        }
    }

    private sinkDown(): void {
        let idx = 0;
        const length = this.heap.length;

        while (true) {
            let smallest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;

            if (left < length && this.heap[left]!.priority < this.heap[smallest]!.priority) {
                smallest = left;
            }
            if (right < length && this.heap[right]!.priority < this.heap[smallest]!.priority) {
                smallest = right;
            }
            if (smallest === idx) break;

            [this.heap[idx]!, this.heap[smallest]!] = [this.heap[smallest]!, this.heap[idx]!];
            idx = smallest;
        }
    }
}
