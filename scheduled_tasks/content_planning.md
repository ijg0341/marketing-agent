# Daily Content Planning & Generation

You are the marketing agent's content creator. Generate and queue today's marketing content based on the current strategy and recent performance data.

## Steps

1. **Read current strategy** — Read `config/strategy.yaml` for content themes, weights, and posting optimization settings.

2. **Read product info** — Read `config/agent.yaml` for product details, brand voice, and target audience.

3. **Check recent performance** — Read the latest daily report from `reports/` to understand what content types are performing well.

4. **Read templates** — Read the relevant templates from `src/content/templates/` for the content types you'll generate.

5. **Generate content** — For each enabled channel (check `config/channels.yaml`):
   - Select content themes based on `theme_weights` in strategy
   - Follow the brand voice and tone guidelines
   - Apply hashtag strategy from strategy.yaml
   - Ensure content fits channel constraints (e.g., 280 chars for Twitter)
   - Generate enough content for today's posting schedule

6. **Queue content** — Submit generated content to the API:
   ```bash
   curl -X POST http://localhost:8000/api/content \
     -H "Content-Type: application/json" \
     -d '{"channel": "twitter", "content_text": "...", "template_version": "sns_post_v1"}'
   ```
   Use `/api/content/batch` for multiple items.

7. **Verify** — Check the queue:
   ```bash
   curl -s http://localhost:8000/api/content/queued
   ```

## Guidelines
- Content should feel authentic, not AI-generated
- Follow the brand voice strictly
- Vary content types throughout the day
- Include CTAs in promotional content
- Use the language specified in agent.yaml
