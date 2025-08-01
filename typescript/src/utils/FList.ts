export class FList<T> implements Iterable<T> {
  private constructor(private readonly head: T | null, private readonly tail: FList<T> | null) {}

  public static empty<T>(): FList<T> {
    return new FList<T>(null, null);
  }

  public static singleton<T>(value: T): FList<T> {
    return new FList<T>(value, FList.empty());
  }

  public prepend(value: T): FList<T> {
    return new FList<T>(value, this);
  }

  public getHead(): T | null {
    return this.head;
  }

  public getTail(): FList<T> | null {
    return this.tail;
  }

  public isEmpty(): boolean {
    return this.head === null;
  }

  public get(index: number): T {
    if (index < 0) {
      throw new Error("Index out of bounds");
    }
    let current: FList<T> | null = this;
    for (let i = 0; i < index; i++) {
      if (current === null || current.isEmpty()) {
        throw new Error("Index out of bounds");
      }
      current = current.getTail();
    }
    if (current === null || current.isEmpty()) {
      throw new Error("Index out of bounds");
    }
    return current.getHead() as T;
  }

  public size(): number {
    let count = 0;
    for (const _ of this) {
      count++;
    }
    return count;
  }

  [Symbol.iterator](): Iterator<T> {
    let current: FList<T> | null = this;

    return {
      next(): IteratorResult<T> {
        if (current === null || current.isEmpty()) {
          return { done: true, value: undefined };
        } else {
          const value = current.head!;
          current = current.tail;
          return { done: false, value: value };
        }
      },
    };
  }
}
