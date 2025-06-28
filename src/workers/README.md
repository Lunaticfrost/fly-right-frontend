# Web Workers Implementation

This directory contains web workers used to offload heavy computations from the main thread.

## Flight Filter Worker

The `flightFilterWorker.js` handles flight filtering operations in a background thread to keep the main UI thread responsive.

### Features

- **Background Processing**: Flight filtering runs in a separate thread
- **Fallback Support**: If the worker fails to load, falls back to synchronous filtering
- **Error Handling**: Graceful error handling with automatic fallback
- **Performance**: Keeps the main thread free for UI interactions

### Usage

The worker is used through the `useFlightFilterWorker` hook:

```typescript
import { useFlightFilterWorker } from '@/hooks/useFlightFilterWorker';

const { filterFlights } = useFlightFilterWorker();

// Filter flights asynchronously
const filteredFlights = await filterFlights(flights, filterCriteria);
```

### How it Works

1. **Worker Creation**: The worker is created when the hook initializes
2. **Message Passing**: Filter criteria and flight data are sent to the worker
3. **Background Processing**: The worker filters flights in a separate thread
4. **Result Return**: Filtered results are sent back to the main thread
5. **Fallback**: If the worker fails, synchronous filtering is used as backup

### Benefits

- **Better UX**: UI remains responsive during filtering
- **Scalability**: Can handle large datasets without blocking
- **Reliability**: Fallback ensures functionality even if workers fail
- **Performance**: Offloads CPU-intensive operations

### Browser Support

Web Workers are supported in all modern browsers. The implementation includes fallbacks for older browsers or when workers are not available. 