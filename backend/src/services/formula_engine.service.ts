import vm from 'vm';

export const evaluateFormula = async (
  expression: string,
  variables: Record<string, number | string>
): Promise<number | string> => {
  try {
    // 1. Create a sandbox context containing the variables
    const sandbox = { ...variables };
    const context = vm.createContext(sandbox);

    // 2. Wrap and sanitize the expression to block risky references
    const blocklist = ['require', 'process', 'global', 'window', 'function', 'eval', 'this', 'constructor', 'prototype'];
    for (const word of blocklist) {
      if (expression.includes(word)) {
        throw new Error(`Unsafe operation detected: ${word}`);
      }
    }

    // 3. Compile and execute inside standard Node.js VM context with a strict 100ms timeout
    const scriptText = `
      (function() {
        try {
          return (${expression});
        } catch(e) {
          return 'ERROR: ' + e.message;
        }
      })()
    `;

    const script = new vm.Script(scriptText);
    const result = script.runInContext(context, { timeout: 100 });
    
    return typeof result === 'number' || typeof result === 'string' ? result : 0;
  } catch (err: any) {
    console.warn(`Formula compilation failed: "${expression}" - ${err.message}`);
    return `ERR: ${err.message}`;
  }
};
