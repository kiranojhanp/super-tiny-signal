# Super Tiny Signal

Super Tiny Signal is a minimal and lightweight reactive state management library designed for modern JavaScript applications. It offers a simple yet powerful way to manage application state using signals, reactive effects, and custom hooks.

## 🚀 Features

- **Tiny and Lightweight:** Minimal footprint for fast and efficient applications.
- **Simple API:** Easy to integrate and intuitive to use.
- **Reactive State Management:** Keep your UI in sync with state changes.
- **Custom Hooks:** Efficient and composable state management.

## 📦 Installation

Install via npm:

```bash
npm install super-tiny-signal
```

## 📖 Usage

### Basic Example

```javascript
import { signal, effect } from "super-tiny-signal";

const count = signal(0);

// Reactive effect to log count changes
effect(() => {
  console.log(`Count is now: ${count.value}`);
});

count.value = 1; // Logs: Count is now: 1
count.value = 2; // Logs: Count is now: 2
```

### Using `createStore`

```javascript
import { createStore } from "super-tiny-signal";

const useStore = createStore()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

const store = useStore();
store.increment();
console.log(store.count.value); // 1
```

### Custom Hooks Example

```javascript
import { useEffect, useState } from "super-tiny-signal";

function Timer() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTime((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>Elapsed Time: {time} seconds</div>;
}
```

## 📚 API Reference

### Core API

- `signal(initialValue)`: Creates a reactive signal.
- `effect(callback)`: Registers a reactive effect.
- `batch(fn)`: Batches updates to avoid redundant effects.

### Store API

- `createStore()`: Initializes a reactive store.

### Hooks API

- `useEffect(callback, deps)`: Runs an effect with optional dependencies.
- `useState(initialValue)`: Returns a stateful value and updater function.

## 📜 License

MIT License.
