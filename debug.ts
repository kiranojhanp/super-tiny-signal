import { signal } from "./src/core/signal.js";
import { computed } from "./src/core/computed.js";

async function test() {
  const count = signal(5);
  console.log("Created signal with value:", count.value);

  const doubled = computed(() => {
    console.log("Computing doubled, count.value =", count.value);
    return count.value * 2;
  });

  console.log("\n=== First access ===");
  console.log("doubled.value =", doubled.value);

  console.log("\n=== Changing count to 10 ===");
  count.value = 10;
  
  // Wait for effects to flush
  await new Promise(resolve => setTimeout(resolve, 20));

  console.log("\n=== Accessing doubled again ===");
  console.log("doubled.value =", doubled.value);
}

test();
