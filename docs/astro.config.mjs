// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://patrickjm.github.io',
	base: '/openai-mock-api',
	integrations: [
		starlight({
			title: 'OpenAI Mock API',
			description: 'A mock OpenAI API server for testing LLM applications',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/patrickjm/openai-mock-api' }
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'introduction' },
						{ label: 'Quick Start', slug: 'quick-start' },
						{ label: 'Installation', slug: 'installation' },
					],
				},
				{
					label: 'Configuration',
					items: [
						{ label: 'Configuration Overview', slug: 'configuration/overview' },
						{ label: 'Matcher Types', slug: 'configuration/matchers' },
						{ label: 'Response Format', slug: 'configuration/responses' },
						{ label: 'Advanced Features', slug: 'configuration/advanced' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Testing Patterns', slug: 'guides/testing-patterns' },
						{ label: 'Streaming Responses', slug: 'guides/streaming' },
						{ label: 'Error Handling', slug: 'guides/error-handling' },
						{ label: 'Integration Examples', slug: 'guides/integration-examples' },
					],
				},
				{
					label: 'API Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
