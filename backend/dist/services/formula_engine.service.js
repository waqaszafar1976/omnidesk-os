"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateFormula = void 0;
const vm_1 = __importDefault(require("vm"));
const evaluateFormula = async (expression, variables) => {
    try {
        // 1. Create a sandbox context containing the variables
        const sandbox = { ...variables };
        const context = vm_1.default.createContext(sandbox);
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
        const script = new vm_1.default.Script(scriptText);
        const result = script.runInContext(context, { timeout: 100 });
        return typeof result === 'number' || typeof result === 'string' ? result : 0;
    }
    catch (err) {
        console.warn(`Formula compilation failed: "${expression}" - ${err.message}`);
        return `ERR: ${err.message}`;
    }
};
exports.evaluateFormula = evaluateFormula;
