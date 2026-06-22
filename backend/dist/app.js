"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const table_routes_1 = __importDefault(require("./routes/table.routes"));
const formula_routes_1 = __importDefault(require("./routes/formula.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const developer_routes_1 = __importDefault(require("./routes/developer.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const workspace_routes_1 = __importDefault(require("./routes/workspace.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Apply JWT verification middleware to all /api/v1 routes
app.use('/api/v1', auth_middleware_1.verifyJWT);
// Register API Routes
app.use('/api/v1', document_routes_1.default);
app.use('/api/v1', table_routes_1.default);
app.use('/api/v1', formula_routes_1.default);
app.use('/api/v1', ai_routes_1.default);
app.use('/api/v1', auth_routes_1.default);
app.use('/api/v1', billing_routes_1.default);
app.use('/api/v1', developer_routes_1.default);
app.use('/api/v1', analytics_routes_1.default);
app.use('/api/v1', task_routes_1.default);
app.use('/api/v1', workspace_routes_1.default);
// Base health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'omnidesk-api-server' });
});
// Seed API endpoint for developer convenience
app.post('/api/v1/seed', async (req, res) => {
    try {
        const { seedMockData } = require('./config/seed_data');
        await seedMockData();
        res.json({ success: true, message: 'Re-seeded database successfully.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Middleware placeholder for JWT setting in postgres context
app.use((req, res, next) => {
    // For MVP demonstration, we mock user headers if not set
    req.headers.user_id = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    next();
});
exports.default = app;
