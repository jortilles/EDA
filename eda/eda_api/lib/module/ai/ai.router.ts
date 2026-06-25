import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { AiController } from './ai.controller';

const router = express.Router();

/**
 * @openapi
 * /assistant/response:
 *   post:
 *     description: Sends a natural language query to the AI assistant and returns a response with data or chart suggestions.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             query:
 *               type: string
 *               description: The natural language question to send to the AI assistant
 *             datasource:
 *               type: string
 *               description: The datasource ID to query against
 *     responses:
 *       200:
 *         description: AI response returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error processing the AI request.
 *     tags:
 *       - AI Assistant Routes
 */
router.post('/response', authGuard, AiController.aIresponse);

/**
 * @openapi
 * /assistant/available:
 *   get:
 *     description: Checks if the AI assistant is available and configured with a valid API key.
 *     responses:
 *       200:
 *         description: Returns availability status of the AI assistant.
 *       401:
 *         description: Unauthorized - authentication required.
 *     tags:
 *       - AI Assistant Routes
 */
router.get('/available', authGuard, AiController.aIavailable);

/**
 * @openapi
 * /assistant/prompt:
 *   post:
 *     description: Sends a custom prompt to the AI assistant for advanced query generation.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             prompt:
 *               type: string
 *               description: Custom prompt text
 *             datasource:
 *               type: string
 *               description: The datasource ID to use as context
 *     responses:
 *       200:
 *         description: Prompt processed and response returned.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error processing the prompt.
 *     tags:
 *       - AI Assistant Routes
 */
router.post('/prompt', authGuard, AiController.aIprompt);

/**
 * @openapi
 * /assistant/suggestions:
 *   post:
 *     description: Requests AI-generated chart type suggestions based on the current query and data context.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             query:
 *               type: string
 *               description: Current query context for chart suggestion
 *             data:
 *               type: object
 *               description: Sample data to base suggestions on
 *     responses:
 *       200:
 *         description: Chart suggestions returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error generating suggestions.
 *     tags:
 *       - AI Assistant Routes
 */
router.post('/suggestions', authGuard, AiController.aiSuggestions);

/**
 * @openapi
 * /assistant/config:
 *   get:
 *     description: Retrieves the current AI assistant configuration (model, API key status, availability).
 *     responses:
 *       200:
 *         description: AI configuration returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *     tags:
 *       - AI Assistant Routes
 */
router.get('/config', authGuard, AiController.aIgetConfig);

/**
 * @openapi
 * /assistant/config:
 *   post:
 *     description: Saves the AI assistant configuration including API key, model selection and other settings.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             apiKey:
 *               type: string
 *               description: AI provider API key
 *             model:
 *               type: string
 *               description: AI model identifier to use
 *             available:
 *               type: boolean
 *               description: Whether the assistant should be enabled
 *     responses:
 *       200:
 *         description: Configuration saved successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error saving configuration.
 *     tags:
 *       - AI Assistant Routes
 */
router.post('/config', authGuard, AiController.aIsaveConfig);

/**
 * @openapi
 * /assistant/generate-dashboard:
 *   post:
 *     description: Generates a complete dashboard with panels using AI based on a natural language description. Supports standard mode (generic domain → 4 KPIs + 2 charts + 1 table) and explicit mode (specific request → 1-3 panels).
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - datasource_id
 *             - description
 *             - title
 *           properties:
 *             datasource_id:
 *               type: string
 *               description: ID of the datasource the dashboard will query
 *             description:
 *               type: string
 *               description: Natural language description of the panels to generate
 *             title:
 *               type: string
 *               description: Title for the new dashboard
 *             visible:
 *               type: string
 *               description: Visibility setting (e.g. 'public', 'group', 'private')
 *             group:
 *               type: array
 *               description: Group IDs if visible is set to 'group'
 *     responses:
 *       201:
 *         description: Dashboard generated and saved successfully.
 *       400:
 *         description: Missing required fields or datasource not available for AI.
 *       404:
 *         description: Datasource not found.
 *       429:
 *         description: Daily or global AI usage limit reached.
 *       503:
 *         description: AI service is not available.
 *       500:
 *         description: Server error generating the dashboard.
 *     tags:
 *       - AI Assistant Routes
 */
router.post('/generate-dashboard', authGuard, AiController.aiGenerateDashboard);

export default router;